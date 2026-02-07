import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getMyReviews, deleteReview } from "@/lib/server/reviews";
import { ReviewCard } from "@/components/reviews/review-card";
import { Card, CardContent } from "@daycare-hub/ui";

export const Route = createFileRoute("/_parent/parent/reviews")({
  loader: () => getMyReviews(),
  component: MyReviewsPage,
});

function MyReviewsPage() {
  const initialReviews = Route.useLoaderData();
  const [reviewsList, setReviewsList] = useState(initialReviews);

  async function handleDelete(reviewId: string) {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      await deleteReview({ data: { reviewId } });
      setReviewsList((prev) => prev.filter((r) => r.id !== reviewId));
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
