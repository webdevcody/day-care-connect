import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminEnrollmentsService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useAdminEnrollments(facilityId: string, status?: string) {
  return useQuery({
    queryKey: queryKeys.admin.enrollments(facilityId, status),
    queryFn: () => adminEnrollmentsService.getFacilityEnrollments(facilityId, { status }),
    enabled: !!facilityId,
  });
}

export function useAdminEnrollmentDetail(facilityId: string, enrollmentId: string) {
  return useQuery({
    queryKey: queryKeys.admin.enrollmentDetail(facilityId, enrollmentId),
    queryFn: () => adminEnrollmentsService.getAdminEnrollmentDetail(enrollmentId, facilityId),
    enabled: !!facilityId && !!enrollmentId,
  });
}

export function useApproveEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminEnrollmentsService.approveEnrollment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "enrollments"] }),
  });
}

export function useRejectEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminEnrollmentsService.rejectEnrollment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "enrollments"] }),
  });
}

export function useBulkEnrollmentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminEnrollmentsService.bulkEnrollmentAction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "enrollments"] }),
  });
}
