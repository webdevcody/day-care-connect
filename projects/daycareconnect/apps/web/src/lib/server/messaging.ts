import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import {
  db,
  conversations,
  messages,
  conversationParticipants,
  users,
  facilities,
  facilityStaff,
  eq,
  and,
  sql,
  desc,
  lt,
  ilike,
  or,
} from "@daycare-hub/db";
import {
  createConversationSchema,
  sendMessageSchema,
  getMessagesSchema,
  markReadSchema,
  muteConversationSchema,
  conversationListSchema,
} from "@daycare-hub/shared";
import {
  assertConversationParticipant,
  assertParentCanMessageFacility,
} from "../messaging-auth";
import { sendNotificationToMany } from "./notification-service";

export const getConversations = createServerFn({ method: "GET" })
  .inputValidator((data: { search?: string }) =>
    conversationListSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const userId = session.user.id;

    const results = await db
      .select({
        id: conversations.id,
        parentId: conversations.parentId,
        facilityId: conversations.facilityId,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        facilityName: facilities.name,
        parentName: users.name,
        isMuted: conversationParticipants.isMuted,
        lastReadAt: conversationParticipants.lastReadAt,
        lastMessage: sql<string>`(
          SELECT content FROM messages
          WHERE messages.conversation_id = ${conversations.id}
          ORDER BY messages.created_at DESC
          LIMIT 1
        )`,
        lastMessageSenderId: sql<string>`(
          SELECT sender_id FROM messages
          WHERE messages.conversation_id = ${conversations.id}
          ORDER BY messages.created_at DESC
          LIMIT 1
        )`,
        unreadCount: sql<number>`(
          SELECT count(*)::int FROM messages
          WHERE messages.conversation_id = ${conversations.id}
          AND messages.created_at > COALESCE(${conversationParticipants.lastReadAt}, '1970-01-01'::timestamptz)
          AND messages.sender_id != ${userId}
        )`,
      })
      .from(conversations)
      .innerJoin(facilities, eq(conversations.facilityId, facilities.id))
      .innerJoin(users, eq(conversations.parentId, users.id))
      .innerJoin(
        conversationParticipants,
        and(
          eq(conversationParticipants.conversationId, conversations.id),
          eq(conversationParticipants.userId, userId)
        )
      )
      .where(
        data.search
          ? or(
              ilike(facilities.name, `%${data.search}%`),
              ilike(users.name, `%${data.search}%`)
            )
          : undefined
      )
      .orderBy(desc(conversations.lastMessageAt));

    return results;
  });

export const createOrGetConversation = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    createConversationSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const userId = session.user.id;
    const userRole = (session.user as any).role;

    if (userRole !== "parent") {
      throw new Error("Only parents can initiate conversations");
    }

    await assertParentCanMessageFacility(userId, data.facilityId);

    // Check for existing conversation
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.parentId, userId),
          eq(conversations.facilityId, data.facilityId)
        )
      )
      .limit(1);

    if (existing) return { conversationId: existing.id };

    // Create conversation
    const [conversation] = await db
      .insert(conversations)
      .values({
        parentId: userId,
        facilityId: data.facilityId,
      })
      .returning();

    // Get facility owner
    const [facility] = await db
      .select({ ownerId: facilities.ownerId })
      .from(facilities)
      .where(eq(facilities.id, data.facilityId))
      .limit(1);

    // Get facility staff
    const staff = await db
      .select({ userId: facilityStaff.userId })
      .from(facilityStaff)
      .where(eq(facilityStaff.facilityId, data.facilityId));

    // Add all participants
    const participantUserIds = new Set([
      userId,
      facility.ownerId,
      ...staff.map((s) => s.userId),
    ]);

    await db.insert(conversationParticipants).values(
      [...participantUserIds].map((uid) => ({
        conversationId: conversation.id,
        userId: uid,
      }))
    );

    return { conversationId: conversation.id };
  });

export const getConversationDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { conversationId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertConversationParticipant(data.conversationId, session.user.id);

    const [conversation] = await db
      .select({
        id: conversations.id,
        parentId: conversations.parentId,
        facilityId: conversations.facilityId,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        facilityName: facilities.name,
        parentName: users.name,
        isMuted: conversationParticipants.isMuted,
      })
      .from(conversations)
      .innerJoin(facilities, eq(conversations.facilityId, facilities.id))
      .innerJoin(users, eq(conversations.parentId, users.id))
      .innerJoin(
        conversationParticipants,
        and(
          eq(conversationParticipants.conversationId, conversations.id),
          eq(conversationParticipants.userId, session.user.id)
        )
      )
      .where(eq(conversations.id, data.conversationId))
      .limit(1);

    if (!conversation) throw new Error("Conversation not found");

    return conversation;
  });

export const getMessages = createServerFn({ method: "GET" })
  .inputValidator((data: { conversationId: string; cursor?: string; limit?: number }) =>
    getMessagesSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertConversationParticipant(data.conversationId, session.user.id);

    const limit = data.limit ?? 50;

    const results = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        status: messages.status,
        createdAt: messages.createdAt,
        senderName: users.name,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        data.cursor
          ? and(
              eq(messages.conversationId, data.conversationId),
              lt(messages.createdAt, new Date(data.cursor))
            )
          : eq(messages.conversationId, data.conversationId)
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    return {
      messages: items,
      nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
    };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    sendMessageSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertConversationParticipant(data.conversationId, session.user.id);

    const now = new Date();

    const [message] = await db
      .insert(messages)
      .values({
        conversationId: data.conversationId,
        senderId: session.user.id,
        content: data.content,
      })
      .returning();

    await db
      .update(conversations)
      .set({ lastMessageAt: now })
      .where(eq(conversations.id, data.conversationId));

    // Also update sender's lastReadAt
    await db
      .update(conversationParticipants)
      .set({ lastReadAt: now })
      .where(
        and(
          eq(conversationParticipants.conversationId, data.conversationId),
          eq(conversationParticipants.userId, session.user.id)
        )
      );

    // Notify other participants
    const participants = await db
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, data.conversationId),
          eq(conversationParticipants.isMuted, false)
        )
      );

    const otherParticipants = participants
      .map((p) => p.userId)
      .filter((id) => id !== session.user.id);

    if (otherParticipants.length > 0) {
      await sendNotificationToMany(otherParticipants, {
        type: "new_message",
        data: {
          senderName: session.user.name,
          preview: data.content.slice(0, 100),
        },
        actionUrl: `/messages/${data.conversationId}`,
      });
    }

    return message;
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    markReadSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertConversationParticipant(data.conversationId, session.user.id);

    await db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, data.conversationId),
          eq(conversationParticipants.userId, session.user.id)
        )
      );

    return { success: true };
  });

export const toggleMuteConversation = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    muteConversationSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertConversationParticipant(data.conversationId, session.user.id);

    await db
      .update(conversationParticipants)
      .set({ isMuted: data.isMuted })
      .where(
        and(
          eq(conversationParticipants.conversationId, data.conversationId),
          eq(conversationParticipants.userId, session.user.id)
        )
      );

    return { success: true };
  });

export const getUnreadCount = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const userId = session.user.id;

    const [result] = await db
      .select({
        count: sql<number>`COALESCE(SUM((
          SELECT count(*)::int FROM messages
          WHERE messages.conversation_id = ${conversationParticipants.conversationId}
          AND messages.created_at > COALESCE(${conversationParticipants.lastReadAt}, '1970-01-01'::timestamptz)
          AND messages.sender_id != ${userId}
        )), 0)::int`,
      })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.userId, userId),
          eq(conversationParticipants.isMuted, false)
        )
      );

    return { count: result?.count ?? 0 };
  }
);
