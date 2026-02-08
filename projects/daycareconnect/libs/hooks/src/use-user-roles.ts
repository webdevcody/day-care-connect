import { useQuery } from "@tanstack/react-query";
import { userRolesService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useUserRoles() {
  return useQuery({
    queryKey: queryKeys.userRoles.all,
    queryFn: () => userRolesService.getUserRoles(),
  });
}
