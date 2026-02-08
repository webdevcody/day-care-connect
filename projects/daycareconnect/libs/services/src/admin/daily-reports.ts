import { getApiClient } from "../client";

export async function getDailyReports(facilityId: string, params?: { date?: string; status?: string }) {
  const searchParams = new URLSearchParams();
  searchParams.set("facilityId", facilityId);
  if (params?.date) searchParams.set("date", params.date);
  if (params?.status) searchParams.set("status", params.status);
  return getApiClient().get<any>(`/api/admin/daily-reports?${searchParams}`);
}

export async function createOrGetDailyReport(data: { childId: string; facilityId: string; date: string }) {
  return getApiClient().post<any>("/api/admin/daily-reports", data);
}

export async function updateDailyReport(reportId: string, data: { summary: string }) {
  return getApiClient().put<any>(`/api/admin/daily-reports/${reportId}`, data);
}

export async function publishDailyReport(reportId: string) {
  return getApiClient().post<any>(`/api/admin/daily-reports/${reportId}/publish`);
}

export async function bulkPublishDailyReports(facilityId: string, reportIds: string[]) {
  return getApiClient().post<any>("/api/admin/daily-reports/bulk-publish", { facilityId, reportIds });
}
