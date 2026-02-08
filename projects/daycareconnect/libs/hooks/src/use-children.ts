import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { childrenService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useChildren() {
  return useQuery({
    queryKey: queryKeys.children.all,
    queryFn: () => childrenService.getMyChildren(),
  });
}

export function useChild(childId: string) {
  return useQuery({
    queryKey: queryKeys.children.detail(childId),
    queryFn: () => childrenService.getChild(childId),
    enabled: !!childId,
  });
}

export function useCreateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: childrenService.createChild,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.children.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, data }: { childId: string; data: any }) =>
      childrenService.updateChild(childId, data),
    onSuccess: (_, { childId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.children.all });
      qc.invalidateQueries({ queryKey: queryKeys.children.detail(childId) });
    },
  });
}

export function useDeleteChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: childrenService.deleteChild,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.children.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
