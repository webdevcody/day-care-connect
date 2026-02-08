import { Hono } from "hono";
import {
  db,
  conversations,
  messages,
  conversationParticipants,
  users,
  facilities,
  facilityStaff,
  children,
  enrollments,
  eq,
  and,
  sql,
  desc,
  ilike,
  or,
} from "@daycare-hub/db";
import { assertFacilityPermission } from "../../lib/facility-auth";

const app = new Hono();

// GET /:facilityId/conversations - List conversations scoped to a specific facility
app.get("/:facilityId/conversations", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const search = c.req.query("search");

  await assertFacilityPermission(facilityId, userId, "messaging:send");

  const conditions: any[] = [
    eq(conversationParticipants.userId, userId),
    eq(conversations.facilityId, facilityId),
  ];

  if (search) {
    conditions.push(ilike(users.name, `%${search}%`));
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

// POST /:facilityId/conversations - Create or get a conversation with a parent
app.post("/:facilityId/conversations", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const body = await c.req.json();
  const { parentId } = body;

  if (!parentId) {
    return c.json({ error: "parentId is required" }, 400);
  }

  await assertFacilityPermission(facilityId, userId, "messaging:send");

  // Validate parent has active enrollment at the facility
  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .where(
      and(
        eq(children.parentId, parentId),
        eq(enrollments.facilityId, facilityId),
        sql`${enrollments.status} IN ('active', 'approved')`
      )
    )
    .limit(1);

  if (!enrollment) {
    return c.json({ error: "Parent does not have an active enrollment at this facility" }, 403);
  }

  // Check for existing conversation
  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.parentId, parentId), eq(conversations.facilityId, facilityId)))
    .limit(1);

  if (existing) {
    return c.json({ conversationId: existing.id });
  }

  // Create conversation
  const [conversation] = await db
    .insert(conversations)
    .values({
      parentId,
      facilityId,
    })
    .returning();

  // Add parent as participant
  await db.insert(conversationParticipants).values({
    conversationId: conversation.id,
    userId: parentId,
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

export { app as adminMessagingRoutes };
