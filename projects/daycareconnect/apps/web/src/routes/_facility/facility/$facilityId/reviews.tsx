import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RatingSummary } from "@/components/reviews/rating-summary";
import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewResponseDialog } from "@/components/reviews/review-response-dialog";
import {
  useAdminFacilityReviews,
  useCreateReviewResponse,
  useUpdateReviewResponse,
} from "@daycare-hub/hooks";
import { Card, CardContent } from "@daycare-hub/ui";

export const Route = createFileRoute("/_facility/facility/$facilityId/reviews")({
  component: AdminReviewsPage,
});

function AdminReviewsPage() {
  const { facilityId } = Route.useParams();
  const { data, isLoading: loading } = useAdminFacilityReviews(facilityId);
  const createReviewResponse = useCreateReviewResponse();
  const updateReviewResponse = useUpdateReviewResponse();
  const [respondingTo, setRespondingTo] = useState<{
    reviewId: string;
    existingBody?: string;
    responseId?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const reviews = data?.reviews ?? [];
  const summary = data?.summary ?? null;

  async function handleSaveResponse(body: string) {
    if (!respondingTo) return;
    setIsSaving(true);
    try {
      if (respondingTo.responseId) {
        await updateReviewResponse.mutateAsync({
          responseId: respondingTo.responseId,
          body,
        });
      } else {
        await createReviewResponse.mutateAsync({
          reviewId: respondingTo.reviewId,
          body,
        });
      }
      setRespondingTo(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Reviews</h1>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading reviews...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {summary && <RatingSummary summary={summary} />}

          {reviews.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No reviews yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  isAdmin
                  onRespond={() => setRespondingTo({ reviewId: review.id })}
                  onEditResponse={() =>
                    setRespondingTo({
                      reviewId: review.id,
                      existingBody: review.response?.body,
                      responseId: review.response?.id,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      <ReviewResponseDialog
        open={!!respondingTo}
        onOpenChange={(open) => !open && setRespondingTo(null)}
        initialBody={respondingTo?.existingBody}
        onSave={handleSaveResponse}
        isSaving={isSaving}
      />
    </div>
  );
}
