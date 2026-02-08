import { getApiClient } from "../client";

export async function getDailyAttendance(facilityId: string, date: string) {
  return getApiClient().get<any>(`/api/admin/attendance/${facilityId}?date=${date}`);
}

export async function checkInChild(attendanceId: string) {
  return getApiClient().post<any>("/api/admin/attendance/check-in", { attendanceId });
}

export async function checkOutChild(attendanceId: string) {
  return getApiClient().post<any>("/api/admin/attendance/check-out", { attendanceId });
}

export async function markAbsent(attendanceId: string, data: { reason: string; notes?: string }) {
  return getApiClient().post<any>("/api/admin/attendance/mark-absent", { attendanceId, ...data });
}

export async function getAttendanceActivityLog(
  facilityId: string,
  params?: { limit?: number; cursor?: string }
) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  const qs = searchParams.toString();
  return getApiClient().get<any>(
    `/api/admin/attendance/${facilityId}/activity-log${qs ? `?${qs}` : ""}`
  );
}

export async function getChildAttendanceHistory(
  facilityId: string,
  childId: string,
  params?: { limit?: number; offset?: number }
) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  return getApiClient().get<any>(
    `/api/admin/attendance/${facilityId}/child-history/${childId}${qs ? `?${qs}` : ""}`
  );
}
