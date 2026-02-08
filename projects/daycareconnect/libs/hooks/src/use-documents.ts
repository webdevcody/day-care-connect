import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useMyDocuments() {
  return useQuery({
    queryKey: queryKeys.documents.all,
    queryFn: () => documentsService.getMyDocuments(),
  });
}

export function useDocumentDetail(instanceId: string) {
  return useQuery({
    queryKey: queryKeys.documents.detail(instanceId),
    queryFn: () => documentsService.getDocumentDetail(instanceId),
    enabled: !!instanceId,
  });
}

export function useMarkDocumentViewed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: documentsService.markDocumentViewed,
    onSuccess: (_, instanceId) => qc.invalidateQueries({ queryKey: queryKeys.documents.detail(instanceId) }),
  });
}

export function useSignDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, data }: { instanceId: string; data: { signatureName: string } }) =>
      documentsService.signDocument(instanceId, data),
    onSuccess: (_, { instanceId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.detail(instanceId) });
      qc.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}
