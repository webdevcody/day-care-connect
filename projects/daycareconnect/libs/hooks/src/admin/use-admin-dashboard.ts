import { useQuery } from "@tanstack/react-query";
import { adminDashboardService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useAdminDashboard(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.admin.dashboard(facilityId),
    queryFn: () => adminDashboardService.getAdminDashboard(facilityId),
    enabled: !!facilityId,
  });
}
