import { getApiClient } from "../client";

export async function getFacilityInvites(facilityId: string) {
  return getApiClient().get<any>(`/api/admin/invites/${facilityId}`);
}

export async function createFacilityInvite(facilityId: string, data?: { name?: string; expiresAt?: string }) {
  return getApiClient().post<any>(`/api/admin/invites/${facilityId}`, data || {});
}

export async function updateFacilityInvite(inviteId: string, data: { name?: string; isActive?: boolean; expiresAt?: string | null }) {
  return getApiClient().put<any>(`/api/admin/invites/${inviteId}`, data);
}

export async function deactivateFacilityInvite(inviteId: string) {
  return getApiClient().delete<any>(`/api/admin/invites/${inviteId}`);
}

export async function getInviteSubmissions(inviteId: string) {
  return getApiClient().get<any>(`/api/admin/invites/${inviteId}/submissions`);
}

export async function reorderDocumentTemplates(facilityId: string, items: { id: string; sortOrder: number }[]) {
  return getApiClient().post<any>("/api/admin/documents/templates/reorder", { facilityId, items });
}
