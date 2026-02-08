import { useQuery } from "@tanstack/react-query";
import { adminReportsService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useEnrollmentReport(facilityId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.admin.enrollmentReport(facilityId),
    queryFn: () => adminReportsService.getEnrollmentReport(facilityId, startDate, endDate),
    enabled: !!facilityId && !!startDate && !!endDate,
  });
}

export function useAttendanceReport(facilityId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.admin.attendanceReport(facilityId),
    queryFn: () => adminReportsService.getAttendanceReport(facilityId, startDate, endDate),
    enabled: !!facilityId && !!startDate && !!endDate,
  });
}

export function useRevenueEstimate(facilityId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.admin.revenueEstimate(facilityId),
    queryFn: () => adminReportsService.getRevenueEstimate(facilityId, startDate, endDate),
    enabled: !!facilityId && !!startDate && !!endDate,
  });
}

export function useEnrollmentAnalytics(facilityId: string, month?: string) {
  return useQuery({
    queryKey: queryKeys.admin.enrollmentAnalytics(facilityId, month),
    queryFn: () => adminReportsService.getEnrollmentAnalytics(facilityId, month),
    enabled: !!facilityId,
  });
}
