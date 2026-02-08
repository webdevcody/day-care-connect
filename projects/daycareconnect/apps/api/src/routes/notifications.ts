import { Hono } from "hono";
import {
  db,
  notifications,
  notificationPreferences,
  quietHours,
  eq,
  and,
  desc,
  lt,
  count,
} from "@daycare-hub/db";

const app = new Hono();

app.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const cursor = c.req.query("cursor");
  const limit = parseInt(c.req.query("limit") || "20", 10);
  const type = c.req.query("type");
  const isReadParam = c.req.query("isRead");

  const conditions: any[] = [eq(notifications.userId, userId)];

  if (cursor) {
    conditions.push(lt(notifications.createdAt, new Date(cursor)));
  }
  if (type) {
    conditions.push(eq(notifications.type, type));
  }
  if (isReadParam !== undefined && isReadParam !== null) {
    conditions.push(eq(notifications.isRead, isReadParam === "true"));
  }

  const result = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      actionUrl: notifications.actionUrl,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit + 1);

  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  return c.json({ notifications: items, nextCursor });
});

app.get("/unread-count", async (c) => {
  const userId = c.get("userId") as string;

  const [result] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return c.json({ count: result?.count ?? 0 });
});

app.post("/:notificationId/read", async (c) => {
  const userId = c.get("userId") as string;
  const notificationId = c.req.param("notificationId");

  const [notification] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .limit(1);

  if (!notification) {
    return c.json({ error: "Notification not found" }, 404);
  }

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId));

  return c.json({ success: true });
});

app.post("/read-all", async (c) => {
  const userId = c.get("userId") as string;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return c.json({ success: true });
});

app.delete("/:notificationId", async (c) => {
  const userId = c.get("userId") as string;
  const notificationId = c.req.param("notificationId");

  const [notification] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .limit(1);

  if (!notification) {
    return c.json({ error: "Notification not found" }, 404);
  }

  await db.delete(notifications).where(eq(notifications.id, notificationId));

  return c.json({ success: true });
});

app.get("/preferences", async (c) => {
  const userId = c.get("userId") as string;

  const result = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  return c.json(result);
});

app.put("/preferences", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { preferences } = body as {
    preferences: { notificationType: string; inAppEnabled: boolean }[];
  };

  for (const pref of preferences) {
    await db
      .insert(notificationPreferences)
      .values({
        userId,
        notificationType: pref.notificationType,
        inAppEnabled: pref.inAppEnabled,
      })
      .onConflictDoUpdate({
        target: [notificationPreferences.userId, notificationPreferences.notificationType],
        set: {
          inAppEnabled: pref.inAppEnabled,
          updatedAt: new Date(),
        },
      });
  }

  return c.json({ success: true });
});

app.get("/quiet-hours", async (c) => {
  const userId = c.get("userId") as string;

  const [result] = await db
    .select()
    .from(quietHours)
    .where(eq(quietHours.userId, userId))
    .limit(1);

  return c.json(result || null);
});

app.put("/quiet-hours", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();

  const [result] = await db
    .insert(quietHours)
    .values({
      userId,
      isEnabled: body.isEnabled,
      startTime: body.startTime,
      endTime: body.endTime,
      timezone: body.timezone,
    })
    .onConflictDoUpdate({
      target: [quietHours.userId],
      set: {
        isEnabled: body.isEnabled,
        startTime: body.startTime,
        endTime: body.endTime,
        timezone: body.timezone,
        updatedAt: new Date(),
      },
    })
    .returning();

  return c.json(result);
});

export { app as notificationsRoutes };
