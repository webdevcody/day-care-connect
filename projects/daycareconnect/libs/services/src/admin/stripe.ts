import { getApiClient } from "../client";

export async function getStripeAccountStatus(facilityId: string) {
  return getApiClient().get<any>(`/api/admin/stripe/${facilityId}/status`);
}

export async function createStripeConnectLink(facilityId: string) {
  return getApiClient().post<{ url: string }>(`/api/admin/stripe/${facilityId}/connect`);
}

export async function getStripeDashboardLink(facilityId: string) {
  return getApiClient().post<{ url: string }>(`/api/admin/stripe/${facilityId}/dashboard`);
}
