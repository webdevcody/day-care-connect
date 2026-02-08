import { getApiClient } from "../client";

export async function getEnrollmentReport(facilityId: string, startDate: string, endDate: string) {
  return getApiClient().get<any>(`/api/admin/reports/enrollment?facilityId=${facilityId}&startDate=${startDate}&endDate=${endDate}`);
}

export async function getAttendanceReport(facilityId: string, startDate: string, endDate: string) {
  return getApiClient().get<any>(`/api/admin/reports/attendance?facilityId=${facilityId}&startDate=${startDate}&endDate=${endDate}`);
}

export async function getRevenueEstimate(facilityId: string, startDate: string, endDate: string) {
  return getApiClient().get<any>(`/api/admin/reports/revenue?facilityId=${facilityId}&startDate=${startDate}&endDate=${endDate}`);
}
