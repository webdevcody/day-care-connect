import { getApiClient } from "./client";

export async function getUserRoles() {
  return getApiClient().get<{ activeRole: string; roles: string[] }>("/api/user-roles");
}
