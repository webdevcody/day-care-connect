import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminAttendanceService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useAdminAttendance(facilityId: string, date: string) {
  return useQuery({
    queryKey: queryKeys.admin.attendance(facilityId, date),
    queryFn: () => adminAttendanceService.getDailyAttendance(facilityId, date),
    enabled: !!facilityId && !!date,
    refetchInterval: 30000,
  });
}

export function useCheckInChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminAttendanceService.checkInChild,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "attendance"] }),
  });
}

export function useCheckOutChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminAttendanceService.checkOutChild,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "attendance"] }),
  });
}

export function useMarkAbsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ attendanceId, reason, notes }: { attendanceId: string; reason: string; notes?: string }) =>
      adminAttendanceService.markAbsent(attendanceId, { reason, notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "attendance"] }),
  });
}
