import { getApiClient } from "../client";

export async function getActivityEntries(facilityId: string, params?: { childId?: string; date?: string }) {
  const searchParams = new URLSearchParams();
  searchParams.set("facilityId", facilityId);
  if (params?.childId) searchParams.set("childId", params.childId);
  if (params?.date) searchParams.set("date", params.date);
  return getApiClient().get<any>(`/api/admin/activities?${searchParams}`);
}

export async function getEnrolledChildren(facilityId: string) {
  return getApiClient().get<any>(`/api/admin/activities/enrolled-children/${facilityId}`);
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
