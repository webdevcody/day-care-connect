import { getApiClient } from "../client";

export async function getFacilityDocumentTemplates(facilityId: string) {
  return getApiClient().get<any>(`/api/admin/documents/templates/${facilityId}`);
}

export async function createDocumentTemplate(facilityId: string, data: any) {
  return getApiClient().post<any>("/api/admin/documents/templates", { facilityId, ...data });
}

export async function updateDocumentTemplate(templateId: string, data: any) {
  return getApiClient().put<any>(`/api/admin/documents/templates/${templateId}`, data);
}

export async function archiveDocumentTemplate(templateId: string) {
  return getApiClient().post<any>(`/api/admin/documents/templates/${templateId}/archive`);
}

export async function sendDocument(data: any) {
  return getApiClient().post<any>("/api/admin/documents/send", data);
}

export async function sendBulkDocument(data: any) {
  return getApiClient().post<any>("/api/admin/documents/send-bulk", data);
}

export async function getFacilityDocumentInstances(facilityId: string, params?: { status?: string; templateId?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.templateId) searchParams.set("templateId", params.templateId);
  return getApiClient().get<any>(`/api/admin/documents/instances/${facilityId}?${searchParams}`);
}

export async function getComplianceReport(facilityId: string) {
  return getApiClient().get<any>(`/api/admin/documents/compliance/${facilityId}`);
}

export async function sendDocumentReminder(instanceId: string) {
  return getApiClient().post<any>(`/api/admin/documents/instances/${instanceId}/remind`);
}

export async function voidDocument(instanceId: string) {
  return getApiClient().post<any>(`/api/admin/documents/instances/${instanceId}/void`);
}

export async function getDocumentFacilityParents(facilityId: string) {
  return getApiClient().get<any>(`/api/admin/documents/parents/${facilityId}`);
}
