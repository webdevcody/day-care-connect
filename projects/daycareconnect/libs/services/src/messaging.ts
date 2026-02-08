import { getApiClient } from "./client";

export async function getConversations(params?: { search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  return getApiClient().get<any>(`/api/messaging/conversations?${searchParams}`);
}

export async function createOrGetConversation(facilityId: string) {
  return getApiClient().post<{ conversationId: string }>("/api/messaging/conversations", { facilityId });
}

export async function getConversationDetail(conversationId: string) {
  return getApiClient().get<any>(`/api/messaging/conversations/${conversationId}`);
}

export async function getMessages(conversationId: string, params?: { cursor?: string; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  return getApiClient().get<any>(`/api/messaging/conversations/${conversationId}/messages?${searchParams}`);
}

export async function sendMessage(conversationId: string, content: string) {
  return getApiClient().post<any>(`/api/messaging/conversations/${conversationId}/messages`, { content });
}

export async function markConversationRead(conversationId: string) {
  return getApiClient().post<{ success: boolean }>(`/api/messaging/conversations/${conversationId}/read`);
}

export async function toggleMuteConversation(conversationId: string, isMuted: boolean) {
  return getApiClient().post<{ success: boolean }>(`/api/messaging/conversations/${conversationId}/mute`, { isMuted });
}

export async function getUnreadMessageCount() {
  return getApiClient().get<{ count: number }>("/api/messaging/unread-count");
}
