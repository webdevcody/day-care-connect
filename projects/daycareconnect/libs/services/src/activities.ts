import { getApiClient } from "./client";

export async function getChildActivities(childId: string, params?: { cursor?: string; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  return getApiClient().get<any>(`/api/activities/children/${childId}?${searchParams}`);
}

export async function getChildDailyReports(childId: string, params?: { startDate?: string; endDate?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);
  return getApiClient().get<any>(`/api/activities/children/${childId}/daily-reports?${searchParams}`);
}

export async function getChildDailyReport(childId: string, date: string) {
  return getApiClient().get<any>(`/api/activities/children/${childId}/daily-reports/${date}`);
}

export async function getChildPhotos(childId: string, params?: { startDate?: string; endDate?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);
  return getApiClient().get<any>(`/api/activities/children/${childId}/photos?${searchParams}`);
}
