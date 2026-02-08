import { getApiClient } from "./client";

export async function getDashboardData() {
  return getApiClient().get<any>("/api/dashboard");
}
