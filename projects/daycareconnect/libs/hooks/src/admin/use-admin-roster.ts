import { useQuery, useMutation } from "@tanstack/react-query";
import { adminRosterService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useAdminRoster(facilityId: string, search?: string) {
  return useQuery({
    queryKey: queryKeys.admin.roster(facilityId),
    queryFn: () => adminRosterService.getFacilityRoster(facilityId, search),
    enabled: !!facilityId,
  });
}

export function useExportRosterCsv() {
  return useMutation({
    mutationFn: adminRosterService.exportRosterCsv,
  });
}
