import { getApiClient } from "./client";

export async function getMyDocuments() {
  return getApiClient().get<any>("/api/documents");
}

export async function getDocumentDetail(instanceId: string) {
  return getApiClient().get<any>(`/api/documents/${instanceId}`);
}

export async function markDocumentViewed(instanceId: string) {
  return getApiClient().post<{ success: boolean }>(`/api/documents/${instanceId}/viewed`);
}

export async function signDocument(instanceId: string, data: { signatureName: string }) {
  return getApiClient().post<any>(`/api/documents/${instanceId}/sign`, data);
}
