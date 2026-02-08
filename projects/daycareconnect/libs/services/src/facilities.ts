import { getApiClient } from "./client";

export async function getMyFacilities() {
  return getApiClient().get<any>("/api/facilities/mine");
}

export async function getFacility(facilityId: string) {
  return getApiClient().get<any>(`/api/facilities/${facilityId}`);
}

export async function getActiveFacilities() {
  return getApiClient().get<any>("/api/facilities");
}

export async function createFacility(data: any) {
  return getApiClient().post<any>("/api/facilities", data);
}

export async function updateFacility(facilityId: string, data: any) {
  return getApiClient().put<any>(`/api/facilities/${facilityId}`, data);
}

export async function toggleFacilityStatus(facilityId: string) {
  return getApiClient().post<any>(`/api/facilities/${facilityId}/toggle-status`);
}

export async function searchFacilities(params: Record<string, any>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        for (const v of value) searchParams.append(key, String(v));
      } else {
        searchParams.set(key, String(value));
      }
    }
  }
  return getApiClient().get<any>(`/api/facilities/search?${searchParams}`);
}

// Facility sub-resources
export async function updateFacilityHours(facilityId: string, hours: any[]) {
  return getApiClient().put<any>(`/api/facilities/${facilityId}/hours`, { hours });
}

export async function addFacilityPhoto(facilityId: string, data: { url: string; altText?: string }) {
  return getApiClient().post<any>(`/api/facilities/${facilityId}/photos`, data);
}

export async function deleteFacilityPhoto(facilityId: string, photoId: string) {
  return getApiClient().delete<any>(`/api/facilities/${facilityId}/photos/${photoId}`);
}

export async function reorderFacilityPhotos(facilityId: string, photoIds: string[]) {
  return getApiClient().post<any>(`/api/facilities/${facilityId}/photos/reorder`, { photoIds });
}

export async function updateFacilityServices(facilityId: string, services: string[]) {
  return getApiClient().put<any>(`/api/facilities/${facilityId}/services`, { services });
}

export async function getFacilityStaff(facilityId: string) {
  return getApiClient().get<any>(`/api/facilities/${facilityId}/staff`);
}

export async function addStaffMember(facilityId: string, data: { email: string; staffRole: string }) {
  return getApiClient().post<any>(`/api/facilities/${facilityId}/staff`, data);
}

export async function removeStaffMember(facilityId: string, staffId: string) {
  return getApiClient().delete<any>(`/api/facilities/${facilityId}/staff/${staffId}`);
}

export async function getStaffAssignments() {
  return getApiClient().get<any>("/api/staff/assignments");
}

export async function getStaffPermissions(facilityId: string, staffId: string) {
  return getApiClient().get<any>(`/api/facilities/${facilityId}/staff/${staffId}/permissions`);
}

export async function updateStaffPermissions(facilityId: string, staffId: string, permissions: string[]) {
  return getApiClient().put<any>(`/api/facilities/${facilityId}/staff/${staffId}/permissions`, { permissions });
}

export async function createStaffAccount(facilityId: string, data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  staffRole: string;
}) {
  return getApiClient().post<any>(`/api/facilities/${facilityId}/staff/create-account`, data);
}

export async function createStaffInvite(facilityId: string, data: { staffRole: string }) {
  return getApiClient().post<any>(`/api/facilities/${facilityId}/staff/invite`, data);
}

export async function getStaffInvites(facilityId: string) {
  return getApiClient().get<any>(`/api/facilities/${facilityId}/staff/invites`);
}

export async function getStaffInviteInfo(token: string) {
  return getApiClient().get<any>(`/api/staff-invite/${token}`);
}

export async function acceptStaffInvite(token: string, data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  return getApiClient().post<any>(`/api/staff-invite/${token}/accept`, data);
}
