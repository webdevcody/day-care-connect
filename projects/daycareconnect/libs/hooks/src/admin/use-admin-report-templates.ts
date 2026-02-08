import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminReportTemplatesService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useAdminReportTemplates(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.admin.reportTemplates(facilityId),
    queryFn: () => adminReportTemplatesService.getReportTemplates(facilityId),
    enabled: !!facilityId,
  });
}

export function useCreateReportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminReportTemplatesService.createReportTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "report-templates"] }),
  });
}
