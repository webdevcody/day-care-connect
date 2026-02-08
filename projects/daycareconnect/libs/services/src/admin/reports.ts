import { getApiClient } from "../client";

export async function getEnrollmentReport(facilityId: string, startDate: string, endDate: string) {
  return getApiClient().get<any>(
    `/api/admin/reports/enrollment?facilityId=${facilityId}&startDate=${startDate}&endDate=${endDate}`
  );
}

export async function getAttendanceReport(facilityId: string, startDate: string, endDate: string) {
  return getApiClient().get<any>(
    `/api/admin/reports/attendance?facilityId=${facilityId}&startDate=${startDate}&endDate=${endDate}`
  );
}

export async function getRevenueEstimate(facilityId: string, startDate: string, endDate: string) {
  return getApiClient().get<any>(
    `/api/admin/reports/revenue?facilityId=${facilityId}&startDate=${startDate}&endDate=${endDate}`
  );
}

export interface EnrollmentAnalyticsData {
  daily: Array<{ date: string; count: number }>;
  monthly: Array<{ month: string; count: number }>;
  selectedMonth: string;
  totalSelectedMonth: number;
  totalLast12Months: number;
}

export async function getEnrollmentAnalytics(facilityId: string, month?: string) {
  const params = new URLSearchParams({ facilityId });
  if (month) params.set("month", month);
  return getApiClient().get<EnrollmentAnalyticsData>(
    `/api/admin/reports/enrollment-analytics?${params.toString()}`
  );
}
