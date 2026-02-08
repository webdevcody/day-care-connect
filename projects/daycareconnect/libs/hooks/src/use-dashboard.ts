import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => dashboardService.getDashboardData(),
  });
}
