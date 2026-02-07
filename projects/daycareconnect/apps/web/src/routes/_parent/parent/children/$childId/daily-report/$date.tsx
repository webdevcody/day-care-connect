import { createFileRoute, Link } from "@tanstack/react-router";
import { getChildDailyReport } from "@/lib/server/parent-activities";
import { ActivityIcon, getActivityLabel } from "@/components/activities/activity-icon";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@daycare-hub/ui";
import { ArrowLeft } from "lucide-react";
import type { ActivityType } from "@daycare-hub/shared";

export const Route = createFileRoute(
  "/_parent/parent/children/$childId/daily-report/$date"
)({
  loader: ({ params }) =>
    getChildDailyReport({
      data: { childId: params.childId, date: params.date },
    }),
  component: DailyReportDetailPage,
});

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDataSummary(type: string, data: Record<string, unknown> | null): string {
  if (!data) return "";
  switch (type) {
    case "meal": {
      const parts: string[] = [];
      if (data.mealType) parts.push(String(data.mealType).replace("_", " "));
      if (data.amountEaten) parts.push(`ate ${data.amountEaten}`);
      if (data.description) parts.push(String(data.description));
      return parts.join(" — ");
    }
    case "nap": {
      const parts: string[] = [];
      if (data.startTime && data.endTime) parts.push(`${data.startTime} - ${data.endTime}`);
      if (data.quality) parts.push(String(data.quality));
      return parts.join(" · ");
    }
    case "activity": {
      const parts: string[] = [];
      if (data.category) parts.push(String(data.category).replace(/_/g, " "));
      if (data.description) parts.push(String(data.description));
      return parts.join(" — ");
    }
    case "mood":
      return data.mood ? String(data.mood) : "";
    case "bathroom":
      return data.bathroomType ? String(data.bathroomType).replace(/_/g, " ") : "";
    case "incident": {
      const parts: string[] = [];
      if (data.severity) parts.push(`[${String(data.severity).toUpperCase()}]`);
      if (data.description) parts.push(String(data.description));
      return parts.join(" ");
    }
    case "milestone":
      return data.title ? String(data.title) : String(data.description || "");
    default:
      return data.content ? String(data.content) : "";
  }
}

function DailyReportDetailPage() {
  const report = Route.useLoaderData();
  const { childId } = Route.useParams();

  const formattedDate = new Date(report.date + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  // Group activities by type
  const grouped = report.activities.reduce(
    (acc: Record<string, typeof report.activities>, activity) => {
      const type = activity.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(activity);
      return acc;
    },
    {}
  );

  // Photos
  const photos = report.activities.filter(
    (a) => a.type === "photo" || a.photoUrl
  );

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
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {report.childFirstName} {report.childLastName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {formattedDate} · {report.facilityName}
        </p>
      </div>

      {/* Summary */}
      {report.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{report.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Activities grouped by type */}
      {Object.entries(grouped).map(([type, activities]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon type={type as ActivityType} />
              {getActivityLabel(type as ActivityType)}
              <Badge variant="secondary" className="ml-auto">
                {activities.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities.map((activity) => {
                const summary = getDataSummary(activity.type, activity.data);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                      {formatTime(activity.occurredAt)}
                    </span>
                    <div className="min-w-0 flex-1">
                      {summary && (
                        <p className="text-sm">{summary}</p>
                      )}
                      {activity.staffName && (
                        <p className="text-xs text-muted-foreground">
                          by {activity.staffName}
                        </p>
                      )}
                      {activity.photoUrl && (
                        <img
                          src={activity.photoUrl}
                          alt="Activity photo"
                          className="mt-2 max-h-48 rounded-md object-cover"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos
                .filter((p) => p.photoUrl)
                .map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.photoUrl!}
                    alt="Activity photo"
                    className="aspect-square rounded-md object-cover"
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {report.activities.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No activities were logged for this day.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
