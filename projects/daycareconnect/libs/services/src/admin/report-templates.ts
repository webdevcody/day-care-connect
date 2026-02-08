import { getApiClient } from "../client";

export function getReportTemplates(facilityId: string) {
  return getApiClient().get<any[]>(`/api/admin/report-templates/${facilityId}`);
}

export function createReportTemplate(data: {
  facilityId: string;
  name: string;
  entries: any[];
}) {
  return getApiClient().post<any>("/api/admin/report-templates", data);
}
