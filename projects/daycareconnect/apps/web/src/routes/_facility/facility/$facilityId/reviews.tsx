import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AdminFacilityNav } from "@/components/admin/admin-facility-nav";
import { RatingSummary } from "@/components/reviews/rating-summary";
import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewResponseDialog } from "@/components/reviews/review-response-dialog";
import {
  getAdminFacilityReviews,
  getReviewSummary,
  createReviewResponse,
  updateReviewResponse,
} from "@/lib/server/reviews";
import { Card, CardContent } from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/reviews"
)({
  component: AdminReviewsPage,
});

function AdminReviewsPage() {
  const { facilityId } = Route.useParams();
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof getAdminFacilityReviews>>>([]);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getReviewSummary>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<{ reviewId: string; existingBody?: string; responseId?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAdminFacilityReviews({ data: { facilityId } }),
      getReviewSummary({ data: { facilityId } }),
    ])
      .then(([reviewData, summaryData]) => {
        setReviews(reviewData);
        setSummary(summaryData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [facilityId]);

  async function handleSaveResponse(body: string) {
    if (!respondingTo) return;
    setIsSaving(true);
    try {
      if (respondingTo.responseId) {
        const updated = await updateReviewResponse({
          data: { responseId: respondingTo.responseId, body },
        });
        setReviews((prev) =>
          prev.map((r) =>
            r.id === respondingTo.reviewId && r.response
              ? { ...r, response: { ...r.response, body: updated.body } }
              : r
          )
        );
      } else {
        const created = await createReviewResponse({
          data: { reviewId: respondingTo.reviewId, body },
        });
        setReviews((prev) =>
          prev.map((r) =>
            r.id === respondingTo.reviewId
              ? {
                  ...r,
                  response: {
                    id: created.id,
                    body: created.body,
                    responderName: "You",
                    responderId: "",
                    reviewId: respondingTo.reviewId,
                    createdAt: created.createdAt,
                  },
                }
              : r
          )
        );
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
      <AdminFacilityNav facilityId={facilityId} />
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
                  onRespond={() =>
                    setRespondingTo({ reviewId: review.id })
                  }
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
