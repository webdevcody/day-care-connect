import { getApiClient } from "../client";

export async function getFacilityRoster(facilityId: string, search?: string) {
  const searchParams = new URLSearchParams();
  if (search) searchParams.set("search", search);
  return getApiClient().get<any>(`/api/admin/roster/${facilityId}?${searchParams}`);
}

export async function exportRosterCsv(facilityId: string) {
  return getApiClient().get<string>(`/api/admin/roster/${facilityId}/export`);
}
