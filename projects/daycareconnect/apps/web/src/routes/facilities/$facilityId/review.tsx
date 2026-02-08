import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useFacility, useReviewEligibility, useCreateReview, useUpdateReview } from "@daycare-hub/hooks";
import { ReviewForm } from "@/components/reviews/review-form";
import { APP_NAME } from "@daycare-hub/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@daycare-hub/ui";

export const Route = createFileRoute("/facilities/$facilityId/review")({
  component: ReviewPage,
});

function ReviewPage() {
  const { facilityId } = Route.useParams();
  const { data: facility, isLoading: facilityLoading } = useFacility(facilityId);
  const { data: eligibility, isLoading: eligibilityLoading } = useReviewEligibility(facilityId);
  const createReviewMutation = useCreateReview();
  const updateReviewMutation = useUpdateReview();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = facilityLoading || eligibilityLoading;

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  if (!facility || !eligibility) return null;

  if (!eligibility.eligible) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <a href="/" className="text-xl font-bold text-primary">{APP_NAME}</a>
          </div>
        </header>
        <div className="mx-auto max-w-2xl px-4 py-12">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                You need to have an active or past enrollment at this facility to leave a review.
              </p>
              <Link
                to="/facilities/$facilityId"
                params={{ facilityId: facility.id }}
                className="mt-4 inline-block text-primary hover:underline"
              >
                Back to {facility.name}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isEditing = !!eligibility.existingReview;

  async function handleSubmit(data: any) {
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateReviewMutation.mutateAsync({
          reviewId: eligibility!.existingReview.id,
          data,
        });
      } else {
        await createReviewMutation.mutateAsync({
          facilityId: facility!.id,
          ...data,
        });
      }
      navigate({
        to: "/facilities/$facilityId",
        params: { facilityId: facility!.id },
      });
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="text-xl font-bold text-primary">{APP_NAME}</a>
          <Link
            to="/facilities/$facilityId"
            params={{ facilityId: facility.id }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to {facility.name}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditing ? "Edit Your Review" : "Write a Review"} for {facility.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewForm
              initialData={eligibility.existingReview || undefined}
              onSubmit={handleSubmit}
              onCancel={() =>
                navigate({
                  to: "/facilities/$facilityId",
                  params: { facilityId: facility!.id },
                })
              }
              isSubmitting={isSubmitting}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
