import { useState } from "react";
import { ReviewCard } from "./review-card";
import { Button } from "@daycare-hub/ui";
import { useReviews, useDeleteReview, useReportReview } from "@daycare-hub/hooks";
import type { ReviewSortOption } from "@daycare-hub/shared";

interface ReviewListProps {
  facilityId: string;
  currentUserId?: string;
  ratingFilter?: number;
  onFilterChange?: (rating: number | undefined) => void;
}

export function ReviewList({ facilityId, currentUserId, ratingFilter, onFilterChange }: ReviewListProps) {
  const [sort, setSort] = useState<ReviewSortOption>("recent");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useReviews({
    facilityId,
    sort,
    rating: ratingFilter,
    page,
    limit: 10,
  });

  const deleteReviewMutation = useDeleteReview();
  const reportReviewMutation = useReportReview();

  function handleDelete(reviewId: string) {
    if (!confirm("Are you sure you want to delete this review?")) return;
    deleteReviewMutation.mutateAsync(reviewId).catch(console.error);
  }

  function handleReport(reviewId: string) {
    reportReviewMutation.mutateAsync(reviewId).catch(console.error);
  }

  if (isLoading) {
    return <p className="py-8 text-center text-muted-foreground">Loading reviews...</p>;
  }

  if (!data || data.totalCount === 0) {
    return <p className="py-8 text-center text-muted-foreground">No reviews yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Sort & filter controls */}
      <div className="flex items-center gap-3">
        <select
          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as ReviewSortOption);
            setPage(1);
          }}
        >
          <option value="recent">Most Recent</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
        </select>
        {ratingFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onFilterChange?.(undefined);
              setPage(1);
            }}
          >
            Clear {ratingFilter}-star filter
          </Button>
        )}
      </div>

      {/* Reviews */}
      {data.reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          isOwner={review.parentId === currentUserId}
          onEdit={() => {
            window.location.href = `/facilities/${facilityId}/review`;
          }}
          onDelete={() => handleDelete(review.id)}
          onReport={() => handleReport(review.id)}
        />
      ))}

      {/* Pagination */}
      {data.totalCount > 10 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(data.totalCount / 10)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data.hasMore}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
