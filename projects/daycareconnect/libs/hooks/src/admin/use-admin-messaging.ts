import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminMessagingService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useFacilityConversations(facilityId: string, search?: string) {
  return useQuery({
    queryKey: queryKeys.admin.facilityConversations(facilityId, search),
    queryFn: () => adminMessagingService.getFacilityConversations(facilityId, search),
    enabled: !!facilityId,
  });
}

export function useCreateFacilityConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, parentId }: { facilityId: string; parentId: string }) =>
      adminMessagingService.createOrGetFacilityConversation(facilityId, parentId),
    onSuccess: (_, { facilityId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.facilityConversations(facilityId) });
      qc.invalidateQueries({ queryKey: queryKeys.messaging.conversations });
    },
  });
}
