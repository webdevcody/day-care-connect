import { Hono } from "hono";
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
  assertConversationParticipant,
  assertParentCanMessageFacility,
} from "../lib/messaging-auth";
import { sendNotificationToMany } from "../lib/notification-service";

const app = new Hono();

app.get("/conversations", async (c) => {
  const userId = c.get("userId") as string;
  const search = c.req.query("search");

  const conditions: any[] = [eq(conversationParticipants.userId, userId)];

  if (search) {
    conditions.push(
      or(
        ilike(facilities.name, `%${search}%`),
        ilike(users.name, `%${search}%`)
      )
    );
  }

  const result = await db
    .select({
      id: conversations.id,
      facilityId: conversations.facilityId,
      facilityName: facilities.name,
      parentId: conversations.parentId,
      parentName: users.name,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      lastMessage: sql<string | null>`(
        SELECT content FROM messages
        WHERE messages.conversation_id = ${conversations.id}
        ORDER BY messages.created_at DESC
        LIMIT 1
      )`,
      lastMessageSenderId: sql<string | null>`(
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
    .where(and(...conditions))
    .orderBy(desc(conversations.lastMessageAt));

  return c.json(result);
});

app.post("/conversations", async (c) => {
  const userId = c.get("userId") as string;
  const user = c.get("user") as any;
  const body = await c.req.json();
  const { facilityId } = body;

  if (user.role !== "parent") {
    return c.json({ error: "Only parents can create conversations" }, 403);
  }

  await assertParentCanMessageFacility(userId, facilityId);

  // Check for existing conversation
  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.parentId, userId),
        eq(conversations.facilityId, facilityId)
      )
    )
    .limit(1);

  if (existing) {
    return c.json({ conversationId: existing.id });
  }

  // Create conversation
  const [conversation] = await db
    .insert(conversations)
    .values({
      parentId: userId,
      facilityId,
    })
    .returning();

  // Add parent as participant
  await db.insert(conversationParticipants).values({
    conversationId: conversation.id,
    userId,
  });

  // Add facility owner as participant
  const [facility] = await db
    .select({ ownerId: facilities.ownerId })
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (facility) {
    await db
      .insert(conversationParticipants)
      .values({
        conversationId: conversation.id,
        userId: facility.ownerId,
      })
      .onConflictDoNothing();
  }

  // Add facility staff as participants
  const staff = await db
    .select({ userId: facilityStaff.userId })
    .from(facilityStaff)
    .where(eq(facilityStaff.facilityId, facilityId));

  for (const member of staff) {
    await db
      .insert(conversationParticipants)
      .values({
        conversationId: conversation.id,
        userId: member.userId,
      })
      .onConflictDoNothing();
  }

  return c.json({ conversationId: conversation.id });
});

app.get("/conversations/:conversationId", async (c) => {
  const userId = c.get("userId") as string;
  const conversationId = c.req.param("conversationId");

  await assertConversationParticipant(conversationId, userId);

  const [conversation] = await db
    .select({
      id: conversations.id,
      facilityId: conversations.facilityId,
      facilityName: facilities.name,
      parentId: conversations.parentId,
      parentName: users.name,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .innerJoin(facilities, eq(conversations.facilityId, facilities.id))
    .innerJoin(users, eq(conversations.parentId, users.id))
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conversation) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  const participants = await db
    .select({
      id: conversationParticipants.id,
      userId: conversationParticipants.userId,
      userName: users.name,
      lastReadAt: conversationParticipants.lastReadAt,
      isMuted: conversationParticipants.isMuted,
    })
    .from(conversationParticipants)
    .innerJoin(users, eq(conversationParticipants.userId, users.id))
    .where(eq(conversationParticipants.conversationId, conversationId));

  return c.json({ ...conversation, participants });
});

app.get("/conversations/:conversationId/messages", async (c) => {
  const userId = c.get("userId") as string;
  const conversationId = c.req.param("conversationId");
  const cursor = c.req.query("cursor");
  const limit = parseInt(c.req.query("limit") || "50", 10);

  await assertConversationParticipant(conversationId, userId);

  const conditions: any[] = [eq(messages.conversationId, conversationId)];

  if (cursor) {
    conditions.push(lt(messages.createdAt, new Date(cursor)));
  }

  const result = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      senderName: users.name,
      content: messages.content,
      status: messages.status,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1);

  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  return c.json({ messages: items, nextCursor });
});

app.post("/conversations/:conversationId/messages", async (c) => {
  const userId = c.get("userId") as string;
  const conversationId = c.req.param("conversationId");
  const body = await c.req.json();

  await assertConversationParticipant(conversationId, userId);

  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      senderId: userId,
      content: body.content,
    })
    .returning();

  // Update conversation lastMessageAt
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conversationId));

  // Update sender's lastReadAt
  await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    );

  // Notify other non-muted participants
  const otherParticipants = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.isMuted, false),
        sql`${conversationParticipants.userId} != ${userId}`
      )
    );

  if (otherParticipants.length > 0) {
    const recipientIds = otherParticipants.map((p) => p.userId);
    await sendNotificationToMany(recipientIds, {
      type: "new_message",
      data: {
        conversationId,
        messageId: message.id,
      },
      actionUrl: `/messaging/${conversationId}`,
    });
  }

  return c.json(message);
});

app.post("/conversations/:conversationId/read", async (c) => {
  const userId = c.get("userId") as string;
  const conversationId = c.req.param("conversationId");

  await assertConversationParticipant(conversationId, userId);

  await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    );

  return c.json({ success: true });
});

app.post("/conversations/:conversationId/mute", async (c) => {
  const userId = c.get("userId") as string;
  const conversationId = c.req.param("conversationId");
  const body = await c.req.json();
  const { isMuted } = body;

  await assertConversationParticipant(conversationId, userId);

  await db
    .update(conversationParticipants)
    .set({ isMuted })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    );

  return c.json({ success: true });
});

app.get("/unread-count", async (c) => {
  const userId = c.get("userId") as string;

  const [result] = await db
    .select({
      count: sql<number>`(
        SELECT count(*)::int FROM messages m
        INNER JOIN conversation_participants cp
          ON cp.conversation_id = m.conversation_id
          AND cp.user_id = ${userId}
          AND cp.is_muted = false
        WHERE m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
        AND m.sender_id != ${userId}
      )`,
    })
    .from(sql`(SELECT 1) as _dummy`);

  return c.json({ count: result?.count ?? 0 });
});

export { app as messagingRoutes };
