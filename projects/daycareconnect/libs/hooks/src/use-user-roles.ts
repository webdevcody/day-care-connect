import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userRolesService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useUserRoles() {
  return useQuery({
    queryKey: queryKeys.userRoles.all,
    queryFn: () => userRolesService.getUserRoles(),
  });
}

export function useSwitchRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: userRolesService.switchRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.userRoles.all }),
  });
}

export function useActivateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: userRolesService.activateRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.userRoles.all }),
  });
}

export function useDeactivateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: userRolesService.deactivateRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.userRoles.all }),
  });
}
