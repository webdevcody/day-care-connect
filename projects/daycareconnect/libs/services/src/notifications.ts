import { getApiClient } from "./client";

export async function getNotifications(params?: { cursor?: string; limit?: number; type?: string; isRead?: boolean }) {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.type) searchParams.set("type", params.type);
  if (params?.isRead !== undefined) searchParams.set("isRead", String(params.isRead));
  return getApiClient().get<any>(`/api/notifications?${searchParams}`);
}

export async function getUnreadNotificationCount() {
  return getApiClient().get<{ count: number }>("/api/notifications/unread-count");
}

export async function markNotificationRead(notificationId: string) {
  return getApiClient().post<{ success: boolean }>(`/api/notifications/${notificationId}/read`);
}

export async function markAllNotificationsRead() {
  return getApiClient().post<{ success: boolean }>("/api/notifications/read-all");
}

export async function deleteNotification(notificationId: string) {
  return getApiClient().delete<{ success: boolean }>(`/api/notifications/${notificationId}`);
}

export async function getNotificationPreferences() {
  return getApiClient().get<any>("/api/notifications/preferences");
}

export async function updateNotificationPreferences(preferences: any[]) {
  return getApiClient().put<{ success: boolean }>("/api/notifications/preferences", { preferences });
}

export async function getQuietHours() {
  return getApiClient().get<any>("/api/notifications/quiet-hours");
}

export async function updateQuietHours(data: any) {
  return getApiClient().put<{ success: boolean }>("/api/notifications/quiet-hours", data);
}

export async function registerPushToken(token: string) {
  return getApiClient().post<{ success: boolean }>("/api/notifications/push/register", { token });
}

export async function unregisterPushToken() {
  return getApiClient().post<{ success: boolean }>("/api/notifications/push/unregister");
}
