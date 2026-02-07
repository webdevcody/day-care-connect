import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authMiddleware } from "@/lib/middleware";
import { getFacility } from "@/lib/server/facilities";
import {
  checkReviewEligibility,
  createReview,
  updateReview,
} from "@/lib/server/reviews";
import { ReviewForm } from "@/components/reviews/review-form";
import { APP_NAME } from "@daycare-hub/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@daycare-hub/ui";

export const Route = createFileRoute("/facilities/$facilityId/review")({
  server: {
    middleware: [authMiddleware],
  },
  loader: async ({ params }) => {
    const [facility, eligibility] = await Promise.all([
      getFacility({ data: { facilityId: params.facilityId } }),
      checkReviewEligibility({ data: { facilityId: params.facilityId } }),
    ]);
    return { facility, eligibility };
  },
  component: ReviewPage,
});

function ReviewPage() {
  const { facility, eligibility } = Route.useLoaderData();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  async function handleSubmit(data: Parameters<typeof createReview>[0]["data"] & { overallRating: number }) {
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateReview({
          data: { reviewId: eligibility.existingReview.id, ...data },
        });
      } else {
        await createReview({
          data: { facilityId: facility.id, ...data },
        });
      }
      navigate({
        to: "/facilities/$facilityId",
        params: { facilityId: facility.id },
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
                  params: { facilityId: facility.id },
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
