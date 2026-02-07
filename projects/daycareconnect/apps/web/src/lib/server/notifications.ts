import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import {
  db,
  notifications,
  notificationPreferences,
  quietHours,
  eq,
  and,
  desc,
  lt,
  sql,
  count,
} from "@daycare-hub/db";
import {
  getNotificationsSchema,
  markNotificationReadSchema,
  deleteNotificationSchema,
  updateNotificationPreferencesSchema,
  updateQuietHoursSchema,
} from "@daycare-hub/shared";

export const getNotifications = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { cursor?: string; limit?: number; type?: string; isRead?: boolean }) =>
      getNotificationsSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const limit = data.limit ?? 20;
    const conditions = [eq(notifications.userId, session.user.id)];

    if (data.cursor) {
      conditions.push(lt(notifications.createdAt, new Date(data.cursor)));
    }
    if (data.type) {
      conditions.push(eq(notifications.type, data.type));
    }
    if (data.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, data.isRead));
    }

    const results = await db
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

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    return {
      notifications: items,
      nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
    };
  });

export const getUnreadNotificationCount = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, session.user.id),
          eq(notifications.isRead, false)
        )
      );

    return { count: result?.count ?? 0 };
  }
);

export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    markNotificationReadSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [notification] = await db
      .select({ id: notifications.id, userId: notifications.userId })
      .from(notifications)
      .where(eq(notifications.id, data.notificationId))
      .limit(1);

    if (!notification) throw new Error("Notification not found");
    if (notification.userId !== session.user.id) throw new Error("Not authorized");

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, data.notificationId));

    return { success: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, session.user.id),
          eq(notifications.isRead, false)
        )
      );

    return { success: true };
  }
);

export const deleteNotification = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    deleteNotificationSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [notification] = await db
      .select({ id: notifications.id, userId: notifications.userId })
      .from(notifications)
      .where(eq(notifications.id, data.notificationId))
      .limit(1);

    if (!notification) throw new Error("Notification not found");
    if (notification.userId !== session.user.id) throw new Error("Not authorized");

    await db
      .delete(notifications)
      .where(eq(notifications.id, data.notificationId));

    return { success: true };
  });

export const getNotificationPreferences = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    return db
      .select({
        id: notificationPreferences.id,
        notificationType: notificationPreferences.notificationType,
        inAppEnabled: notificationPreferences.inAppEnabled,
        pushEnabled: notificationPreferences.pushEnabled,
      })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, session.user.id));
  }
);

export const updateNotificationPreferences = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    updateNotificationPreferencesSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    for (const pref of data.preferences) {
      await db
        .insert(notificationPreferences)
        .values({
          userId: session.user.id,
          notificationType: pref.notificationType,
          inAppEnabled: pref.inAppEnabled,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [notificationPreferences.userId, notificationPreferences.notificationType],
          set: {
            inAppEnabled: pref.inAppEnabled,
            updatedAt: new Date(),
          },
        });
    }

    return { success: true };
  });

export const getQuietHours = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [result] = await db
      .select({
        isEnabled: quietHours.isEnabled,
        startTime: quietHours.startTime,
        endTime: quietHours.endTime,
        timezone: quietHours.timezone,
      })
      .from(quietHours)
      .where(eq(quietHours.userId, session.user.id))
      .limit(1);

    return result || null;
  }
);

export const updateQuietHours = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    updateQuietHoursSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await db
      .insert(quietHours)
      .values({
        userId: session.user.id,
        isEnabled: data.isEnabled,
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [quietHours.userId],
        set: {
          isEnabled: data.isEnabled,
          startTime: data.startTime,
          endTime: data.endTime,
          timezone: data.timezone,
          updatedAt: new Date(),
        },
      });

    return { success: true };
  });
