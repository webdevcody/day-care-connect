import { getApiClient } from "./client";

export async function toggleFavorite(facilityId: string) {
  return getApiClient().post<{ favorited: boolean }>("/api/favorites/toggle", { facilityId });
}

export async function getMyFavorites() {
  return getApiClient().get<any>("/api/favorites");
}
