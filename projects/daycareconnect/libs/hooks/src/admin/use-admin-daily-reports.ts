import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminDailyReportsService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useAdminDailyReports(facilityId: string, params?: { date?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.admin.dailyReports(facilityId, params),
    queryFn: () => adminDailyReportsService.getDailyReports(facilityId, params),
    enabled: !!facilityId,
  });
}

export function useCreateOrGetDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminDailyReportsService.createOrGetDailyReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "daily-reports"] }),
  });
}

export function useUpdateDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, summary }: { reportId: string; summary: string }) =>
      adminDailyReportsService.updateDailyReport(reportId, { summary }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "daily-reports"] }),
  });
}

export function usePublishDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminDailyReportsService.publishDailyReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "daily-reports"] }),
  });
}

export function useBulkPublishDailyReports() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, reportIds }: { facilityId: string; reportIds: string[] }) =>
      adminDailyReportsService.bulkPublishDailyReports(facilityId, reportIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "daily-reports"] }),
  });
}
