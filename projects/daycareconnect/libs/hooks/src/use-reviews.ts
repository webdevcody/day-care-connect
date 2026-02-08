import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewsService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useReviewEligibility(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.reviews.eligibility(facilityId),
    queryFn: () => reviewsService.checkReviewEligibility(facilityId),
    enabled: !!facilityId,
  });
}

export function useReviewSummary(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.reviews.summary(facilityId),
    queryFn: () => reviewsService.getReviewSummary(facilityId),
    enabled: !!facilityId,
  });
}

export function useReviews(params: { facilityId: string; sort?: string; rating?: number; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.reviews.list(params),
    queryFn: () => reviewsService.getReviews(params),
    enabled: !!params.facilityId,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reviewsService.createReview,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, data }: { reviewId: string; data: any }) =>
      reviewsService.updateReview(reviewId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reviewsService.deleteReview,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });
}

export function useReportReview() {
  return useMutation({
    mutationFn: reviewsService.reportReview,
  });
}

export function useCreateReviewResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, body }: { reviewId: string; body: string }) =>
      reviewsService.createReviewResponse(reviewId, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });
}

export function useUpdateReviewResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ responseId, body }: { responseId: string; body: string }) =>
      reviewsService.updateReviewResponse(responseId, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });
}

export function useMyReviews() {
  return useQuery({
    queryKey: queryKeys.reviews.mine,
    queryFn: () => reviewsService.getMyReviews(),
  });
}

export function useAdminFacilityReviews(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.reviews.admin(facilityId),
    queryFn: () => reviewsService.getAdminFacilityReviews(facilityId),
    enabled: !!facilityId,
  });
}
