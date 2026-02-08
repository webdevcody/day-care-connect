import { getApiClient } from "../client";

export async function getAdminDashboard(facilityId: string) {
  return getApiClient().get<any>(`/api/admin/dashboard/${facilityId}`);
}
