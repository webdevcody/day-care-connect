import { getApiClient } from "./client";

export async function getInviteInfo(code: string) {
  return getApiClient().get<any>(`/api/invites/${code}`);
}

export async function startInvite(code: string, data: { childId?: string; child?: any }) {
  return getApiClient().post<any>(`/api/invites/${code}/start`, data);
}

export async function submitInviteForm(code: string, data: { templateId: string; formData?: any; signatureName?: string }) {
  return getApiClient().post<any>(`/api/invites/${code}/submit-form`, data);
}

export async function completeInvite(code: string, data?: { scheduleType?: string; startDate?: string; notes?: string }) {
  return getApiClient().post<any>(`/api/invites/${code}/complete`, data || {});
}
