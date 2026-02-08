import { getApiClient } from "../client";

export interface FacilityConversation {
  id: string;
  facilityId: string;
  facilityName: string;
  parentId: string;
  parentName: string;
  lastMessageAt: string | null;
  createdAt: string;
  lastMessage: string | null;
  lastMessageSenderId: string | null;
  unreadCount: number;
}

export async function getFacilityConversations(
  facilityId: string,
  search?: string
): Promise<FacilityConversation[]> {
  const searchParams = new URLSearchParams();
  if (search) searchParams.set("search", search);
  const query = searchParams.toString();
  return getApiClient().get<FacilityConversation[]>(
    `/api/admin/messaging/${facilityId}/conversations${query ? `?${query}` : ""}`
  );
}

export async function createOrGetFacilityConversation(
  facilityId: string,
  parentId: string
): Promise<{ conversationId: string }> {
  return getApiClient().post<{ conversationId: string }>(
    `/api/admin/messaging/${facilityId}/conversations`,
    { parentId }
  );
}
