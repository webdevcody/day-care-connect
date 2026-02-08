import { getApiClient } from "./client";

export async function getUserRoles() {
  return getApiClient().get<{ activeRole: string; roles: string[] }>("/api/user-roles");
}

export async function switchRole(role: string) {
  return getApiClient().post<{ activeRole: string }>("/api/user-roles/switch", { role });
}

export async function activateRole(role: string) {
  return getApiClient().post<{ success: boolean }>("/api/user-roles/activate", { role });
}

export async function deactivateRole(role: string) {
  return getApiClient().post<{ success: boolean }>("/api/user-roles/deactivate", { role });
}
