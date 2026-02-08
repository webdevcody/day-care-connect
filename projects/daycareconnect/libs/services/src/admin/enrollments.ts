import { getApiClient } from "../client";

export async function getFacilityEnrollments(facilityId: string, params?: { status?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  return getApiClient().get<any>(`/api/admin/enrollments/${facilityId}?${searchParams}`);
}

export async function getAdminEnrollmentDetail(enrollmentId: string, facilityId: string) {
  return getApiClient().get<any>(`/api/admin/enrollments/detail/${enrollmentId}?facilityId=${facilityId}`);
}

export async function approveEnrollment(data: { enrollmentId: string; startDate?: string }) {
  return getApiClient().post<any>(`/api/admin/enrollments/${data.enrollmentId}/approve`, { startDate: data.startDate });
}

export async function rejectEnrollment(data: { enrollmentId: string; reason: string }) {
  return getApiClient().post<any>(`/api/admin/enrollments/${data.enrollmentId}/reject`, { reason: data.reason });
}

export async function bulkEnrollmentAction(data: { enrollmentIds: string[]; action: string; reason?: string }) {
  return getApiClient().post<any>("/api/admin/enrollments/bulk", data);
}
