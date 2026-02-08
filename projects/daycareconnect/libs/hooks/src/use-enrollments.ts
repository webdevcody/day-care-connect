import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enrollmentsService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useEnrollments() {
  return useQuery({
    queryKey: queryKeys.enrollments.all,
    queryFn: () => enrollmentsService.getMyEnrollments(),
  });
}

export function useEnrollment(enrollmentId: string) {
  return useQuery({
    queryKey: queryKeys.enrollments.detail(enrollmentId),
    queryFn: () => enrollmentsService.getEnrollment(enrollmentId),
    enabled: !!enrollmentId,
  });
}

export function useEnrollmentHistory(enrollmentId: string) {
  return useQuery({
    queryKey: queryKeys.enrollments.history(enrollmentId),
    queryFn: () => enrollmentsService.getEnrollmentHistory(enrollmentId),
    enabled: !!enrollmentId,
  });
}

export function useCreateEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: enrollmentsService.createEnrollment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.enrollments.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useWithdrawEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, reason }: { enrollmentId: string; reason?: string }) =>
      enrollmentsService.withdrawEnrollment(enrollmentId, { reason }),
    onSuccess: (_, { enrollmentId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.enrollments.all });
      qc.invalidateQueries({ queryKey: queryKeys.enrollments.detail(enrollmentId) });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
