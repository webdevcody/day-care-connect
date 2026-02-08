import { getApiClient } from "./client";

export async function getMyChildren() {
  return getApiClient().get<any>("/api/children");
}

export async function getChild(childId: string) {
  return getApiClient().get<any>(`/api/children/${childId}`);
}

export async function createChild(data: any) {
  return getApiClient().post<any>("/api/children", data);
}

export async function updateChild(childId: string, data: any) {
  return getApiClient().put<any>(`/api/children/${childId}`, data);
}

export async function deleteChild(childId: string) {
  return getApiClient().delete<any>(`/api/children/${childId}`);
}
