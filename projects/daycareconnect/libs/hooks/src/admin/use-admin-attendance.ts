import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
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

export function useAttendanceActivityLog(facilityId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.admin.attendanceActivityLog(facilityId),
    queryFn: ({ pageParam }) =>
      adminAttendanceService.getAttendanceActivityLog(facilityId, {
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
    enabled: !!facilityId,
  });
}

export function useChildAttendanceHistory(facilityId: string, childId: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.childAttendanceHistory(facilityId, childId ?? ""),
    queryFn: () => adminAttendanceService.getChildAttendanceHistory(facilityId, childId!),
    enabled: !!facilityId && !!childId,
  });
}

export function useCheckInChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminAttendanceService.checkInChild,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "attendance"] });
      qc.invalidateQueries({ queryKey: ["admin", "attendance-activity-log"] });
      qc.invalidateQueries({ queryKey: ["admin", "child-attendance-history"] });
    },
  });
}

export function useCheckOutChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminAttendanceService.checkOutChild,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "attendance"] });
      qc.invalidateQueries({ queryKey: ["admin", "attendance-activity-log"] });
      qc.invalidateQueries({ queryKey: ["admin", "child-attendance-history"] });
    },
  });
}

export function useMarkAbsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ attendanceId, reason, notes }: { attendanceId: string; reason: string; notes?: string }) =>
      adminAttendanceService.markAbsent(attendanceId, { reason, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "attendance"] });
      qc.invalidateQueries({ queryKey: ["admin", "attendance-activity-log"] });
      qc.invalidateQueries({ queryKey: ["admin", "child-attendance-history"] });
    },
  });
}
