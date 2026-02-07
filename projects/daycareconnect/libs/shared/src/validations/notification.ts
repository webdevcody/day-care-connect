import { z } from "zod";
import { NOTIFICATION_TYPES } from "../constants";

export const getNotificationsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  isRead: z.boolean().optional(),
});

export const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid("Invalid notification ID"),
});

export const deleteNotificationSchema = z.object({
  notificationId: z.string().uuid("Invalid notification ID"),
});

export const updateNotificationPreferencesSchema = z.object({
  preferences: z.array(
    z.object({
      notificationType: z.enum(NOTIFICATION_TYPES),
      inAppEnabled: z.boolean(),
    })
  ),
});

export const updateQuietHoursSchema = z.object({
  isEnabled: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  timezone: z.string().min(1, "Timezone is required"),
});

export const createNotificationSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  recipientId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  actionUrl: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export type GetNotificationsInput = z.infer<typeof getNotificationsSchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
export type DeleteNotificationInput = z.infer<typeof deleteNotificationSchema>;
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
export type UpdateQuietHoursInput = z.infer<typeof updateQuietHoursSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
