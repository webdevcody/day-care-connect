import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getChildActivities } from "@/lib/server/parent-activities";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { Button, Input, Card, CardContent } from "@daycare-hub/ui";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute(
  "/_parent/parent/children/$childId/activities"
)({
  component: ChildActivitiesPage,
});

function ChildActivitiesPage() {
  const { childId } = Route.useParams();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchActivities = async (cursor?: string) => {
    try {
      const data = await getChildActivities({
        data: { childId, cursor, limit: 20 },
      });
      if (cursor) {
        setActivities((prev) => [...prev, ...data.activities]);
      } else {
        setActivities(data.activities);
      }
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [childId]);

  const handleLoadMore = () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    fetchActivities(nextCursor);
  };

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

      {loading ? (
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
          {nextCursor && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
