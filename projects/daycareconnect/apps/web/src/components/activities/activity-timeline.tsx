import type { ActivityType } from "@daycare-hub/shared";
import { ActivityIcon, getActivityLabel } from "./activity-icon";
import { Button, Card, CardContent } from "@daycare-hub/ui";
import { Pencil, Trash2 } from "lucide-react";

interface ActivityEntry {
  id: string;
  type: ActivityType;
  data: Record<string, unknown> | null;
  photoUrl: string | null;
  occurredAt: string | Date;
  childFirstName?: string;
  childLastName?: string;
  staffName?: string;
  facilityName?: string;
}

interface ActivityTimelineProps {
  entries: ActivityEntry[];
  showChildName?: boolean;
  showStaffName?: boolean;
  onEdit?: (entry: ActivityEntry) => void;
  onDelete?: (entryId: string) => void;
}

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDataSummary(type: ActivityType, data: Record<string, unknown> | null): string {
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
      return data.bathroomType
        ? String(data.bathroomType).replace(/_/g, " ")
        : "";
    case "incident": {
      const parts: string[] = [];
      if (data.severity) parts.push(`[${String(data.severity).toUpperCase()}]`);
      if (data.description) parts.push(String(data.description));
      return parts.join(" ");
    }
    case "milestone":
      return data.title ? String(data.title) : String(data.description || "");
    case "photo":
    case "note":
      return data.content ? String(data.content) : "";
    default:
      return "";
  }
}

export function ActivityTimeline({
  entries,
  showChildName = true,
  showStaffName = false,
  onEdit,
  onDelete,
}: ActivityTimelineProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No activities logged yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const summary = getDataSummary(entry.type, entry.data);
        return (
          <Card key={entry.id}>
            <CardContent className="flex items-start gap-3 py-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <ActivityIcon type={entry.type} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {getActivityLabel(entry.type)}
                  </span>
                  {showChildName && entry.childFirstName && (
                    <span className="text-sm text-muted-foreground">
                      — {entry.childFirstName} {entry.childLastName}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatTime(entry.occurredAt)}
                  </span>
                </div>
                {summary && (
                  <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                    {summary}
                  </p>
                )}
                {showStaffName && entry.staffName && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    by {entry.staffName}
                  </p>
                )}
                {entry.photoUrl && (
                  <img
                    src={entry.photoUrl}
                    alt="Activity photo"
                    className="mt-2 max-h-32 rounded-md object-cover"
                  />
                )}
              </div>
              {(onEdit || onDelete) && (
                <div className="flex shrink-0 gap-1">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(entry)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(entry.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
