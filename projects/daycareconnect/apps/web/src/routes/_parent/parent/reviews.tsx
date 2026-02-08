import { createFileRoute, Link } from "@tanstack/react-router";
import { useMyReviews, useDeleteReview } from "@daycare-hub/hooks";
import { ReviewCard } from "@/components/reviews/review-card";
import { Card, CardContent } from "@daycare-hub/ui";

export const Route = createFileRoute("/_parent/parent/reviews")({
  component: MyReviewsPage,
});

function MyReviewsPage() {
  const { data: reviews, isLoading } = useMyReviews();
  const deleteReviewMutation = useDeleteReview();

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  const reviewsList = reviews ?? [];

  async function handleDelete(reviewId: string) {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      await deleteReviewMutation.mutateAsync(reviewId);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">My Reviews</h1>

      {reviewsList.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">You haven't written any reviews yet.</p>
            <Link to="/discover" className="mt-2 inline-block text-primary hover:underline">
              Discover facilities
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviewsList.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              isOwner
              onEdit={() => {
                window.location.href = `/facilities/${review.facilityId}/review`;
              }}
              onDelete={() => handleDelete(review.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
