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
