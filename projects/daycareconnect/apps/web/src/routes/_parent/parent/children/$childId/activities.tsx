import { createFileRoute, Link } from "@tanstack/react-router";
import { useChildActivities } from "@daycare-hub/hooks";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { Button, Card, CardContent } from "@daycare-hub/ui";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute(
  "/_parent/parent/children/$childId/activities"
)({
  component: ChildActivitiesPage,
});

function ChildActivitiesPage() {
  const { childId } = Route.useParams();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useChildActivities(childId);

  const activities = data?.pages.flatMap((p) => p.activities) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link
            to="/parent/children/$childId"
            params={{ childId }}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Activity Feed</h1>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading activities...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <ActivityTimeline
            entries={activities}
            showChildName={false}
            showStaffName={true}
          />
          {hasNextPage && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
