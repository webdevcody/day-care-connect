import { getApiClient } from "./client";

export async function updateProfile(data: { firstName: string; lastName: string; phone?: string }) {
  return getApiClient().post<any>("/api/account/profile", data);
}

export async function changePassword(data: { currentPassword: string; newPassword: string }) {
  return getApiClient().post<{ success: boolean }>("/api/account/password", data);
}
