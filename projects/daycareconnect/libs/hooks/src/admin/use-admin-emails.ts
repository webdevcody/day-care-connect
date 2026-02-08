import { useQuery, useMutation } from "@tanstack/react-query";
import { adminEmailsService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useEnrolledParents(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.admin.enrolledParents(facilityId),
    queryFn: () => adminEmailsService.getEnrolledParents(facilityId),
    enabled: !!facilityId,
  });
}

export function useSendParentEmail() {
  return useMutation({
    mutationFn: adminEmailsService.sendEmail,
  });
}
