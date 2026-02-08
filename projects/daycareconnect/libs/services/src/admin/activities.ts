import { getApiClient } from "../client";

export async function getActivityEntries(
  facilityId: string,
  params?: { childId?: string; date?: string }
) {
  const date = params?.date || new Date().toISOString().split("T")[0];
  const searchParams = new URLSearchParams();
  if (params?.childId) searchParams.set("childId", params.childId);
  const query = searchParams.toString();
  return getApiClient().get<any>(
    `/api/admin/activities/${facilityId}/${date}${query ? `?${query}` : ""}`
  );
}

export async function getEnrolledChildren(facilityId: string) {
  return getApiClient().get<any>(`/api/admin/activities/${facilityId}/children`);
}

export async function createActivityEntry(data: any) {
  return getApiClient().post<any>("/api/admin/activities", data);
}

export async function bulkCreateActivityEntries(data: any) {
  return getApiClient().post<any>("/api/admin/activities/bulk", data);
}

export async function updateActivityEntry(activityId: string, data: any) {
  return getApiClient().put<any>(`/api/admin/activities/${activityId}`, data);
}

export async function deleteActivityEntry(activityId: string) {
  return getApiClient().delete<{ success: boolean }>(`/api/admin/activities/${activityId}`);
}
