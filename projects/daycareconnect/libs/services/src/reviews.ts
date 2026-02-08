import { getApiClient } from "./client";

export async function checkReviewEligibility(facilityId: string) {
  return getApiClient().get<any>(`/api/reviews/eligibility/${facilityId}`);
}

export async function getReviewSummary(facilityId: string) {
  return getApiClient().get<any>(`/api/reviews/summary/${facilityId}`);
}

export async function getReviews(params: { facilityId: string; sort?: string; rating?: number; page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  searchParams.set("facilityId", params.facilityId);
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.rating) searchParams.set("rating", String(params.rating));
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  return getApiClient().get<any>(`/api/reviews?${searchParams}`);
}

export async function createReview(data: any) {
  return getApiClient().post<any>("/api/reviews", data);
}

export async function updateReview(reviewId: string, data: any) {
  return getApiClient().put<any>(`/api/reviews/${reviewId}`, data);
}

export async function deleteReview(reviewId: string) {
  return getApiClient().delete<{ success: boolean }>(`/api/reviews/${reviewId}`);
}

export async function reportReview(reviewId: string) {
  return getApiClient().post<{ success: boolean }>(`/api/reviews/${reviewId}/report`);
}

export async function createReviewResponse(reviewId: string, data: { body: string }) {
  return getApiClient().post<any>(`/api/reviews/${reviewId}/response`, data);
}

export async function updateReviewResponse(responseId: string, data: { body: string }) {
  return getApiClient().put<any>(`/api/reviews/responses/${responseId}`, data);
}

export async function getMyReviews() {
  return getApiClient().get<any>("/api/reviews/mine");
}

export async function getAdminFacilityReviews(facilityId: string) {
  return getApiClient().get<any>(`/api/reviews/admin/${facilityId}`);
}
