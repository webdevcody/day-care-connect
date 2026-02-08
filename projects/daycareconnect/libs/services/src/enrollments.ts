import { getApiClient } from "./client";

export async function getMyEnrollments() {
  return getApiClient().get<any>("/api/enrollments");
}

export async function getEnrollment(enrollmentId: string) {
  return getApiClient().get<any>(`/api/enrollments/${enrollmentId}`);
}

export async function getEnrollmentHistory(enrollmentId: string) {
  return getApiClient().get<any>(`/api/enrollments/${enrollmentId}/history`);
}

export async function createEnrollment(data: any) {
  return getApiClient().post<any>("/api/enrollments", data);
}

export async function withdrawEnrollment(enrollmentId: string, data?: { reason?: string }) {
  return getApiClient().post<any>(`/api/enrollments/${enrollmentId}/withdraw`, data);
}
