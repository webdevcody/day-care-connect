import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminInvitesService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useAdminFacilityInvites(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.admin.invites(facilityId),
    queryFn: () => adminInvitesService.getFacilityInvites(facilityId),
    enabled: !!facilityId,
  });
}

export function useCreateFacilityInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, data }: { facilityId: string; data?: { name?: string; expiresAt?: string } }) =>
      adminInvitesService.createFacilityInvite(facilityId, data),
    onSuccess: (_, { facilityId }) =>
      qc.invalidateQueries({ queryKey: queryKeys.admin.invites(facilityId) }),
  });
}

export function useUpdateFacilityInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inviteId, data }: { inviteId: string; data: { name?: string; isActive?: boolean; expiresAt?: string | null } }) =>
      adminInvitesService.updateFacilityInvite(inviteId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "invites"] }),
  });
}

export function useDeactivateFacilityInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminInvitesService.deactivateFacilityInvite,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "invites"] }),
  });
}

export function useInviteSubmissions(inviteId: string) {
  return useQuery({
    queryKey: queryKeys.admin.inviteSubmissions(inviteId),
    queryFn: () => adminInvitesService.getInviteSubmissions(inviteId),
    enabled: !!inviteId,
  });
}

export function useReorderDocumentTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, items }: { facilityId: string; items: { id: string; sortOrder: number }[] }) =>
      adminInvitesService.reorderDocumentTemplates(facilityId, items),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "document-templates"] }),
  });
}
