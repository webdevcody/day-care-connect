import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invitesService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useInviteInfo(code: string) {
  return useQuery({
    queryKey: queryKeys.invites.info(code),
    queryFn: () => invitesService.getInviteInfo(code),
    enabled: !!code,
  });
}

export function useStartInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: { childId?: string; child?: any } }) =>
      invitesService.startInvite(code, data),
    onSuccess: (_, { code }) =>
      qc.invalidateQueries({ queryKey: queryKeys.invites.info(code) }),
  });
}

export function useSubmitInviteForm() {
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: { templateId: string; formData?: any; signatureName?: string } }) =>
      invitesService.submitInviteForm(code, data),
  });
}

export function useCompleteInvite() {
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data?: { scheduleType?: string; startDate?: string; notes?: string } }) =>
      invitesService.completeInvite(code, data),
  });
}
