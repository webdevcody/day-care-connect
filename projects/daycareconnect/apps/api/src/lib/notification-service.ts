import {
  db,
  notifications,
  notificationPreferences,
  eq,
  and,
} from "@daycare-hub/db";
import type { NotificationType } from "@daycare-hub/shared";
import { NOTIFICATION_TEMPLATES } from "./notification-templates";

interface SendNotificationParams {
  type: NotificationType;
  recipientId: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
}

export async function sendNotification({
  type,
  recipientId,
  data = {},
  actionUrl,
}: SendNotificationParams) {
  const [pref] = await db
    .select({ inAppEnabled: notificationPreferences.inAppEnabled })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, recipientId),
        eq(notificationPreferences.notificationType, type)
      )
    )
    .limit(1);

  if (pref && !pref.inAppEnabled) {
    return null;
  }

  const template = NOTIFICATION_TEMPLATES[type];
  const title = template.title(data);
  const body = template.body(data);

  const [notification] = await db
    .insert(notifications)
    .values({
      userId: recipientId,
      type,
      title,
      body,
      actionUrl,
      data,
    })
    .returning();

  return notification;
}

export async function sendNotificationToMany(
  recipients: string[],
  params: Omit<SendNotificationParams, "recipientId">
) {
  const results = await Promise.all(
    recipients.map((recipientId) =>
      sendNotification({ ...params, recipientId })
    )
  );
  return results.filter(Boolean);
}
