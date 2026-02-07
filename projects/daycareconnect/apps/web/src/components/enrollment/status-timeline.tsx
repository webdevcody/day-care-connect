import { Badge } from "@daycare-hub/ui";

interface StatusHistoryEntry {
  id: string;
  status: string;
  reason: string | null;
  createdAt: string;
  changedByName: string;
}

function statusColor(status: string) {
  switch (status) {
    case "pending": return "secondary";
    case "approved": return "default";
    case "active": return "default";
    case "withdrawn": return "destructive";
    case "rejected": return "destructive";
    default: return "secondary";
  }
}

export function StatusTimeline({ history }: { history: StatusHistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No status history available.</p>;
  }

  return (
    <div className="space-y-4">
      {history.map((entry, index) => (
        <div key={entry.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full border-2 border-primary bg-background" />
            {index < history.length - 1 && (
              <div className="w-px flex-1 bg-border" />
            )}
          </div>
          <div className="pb-4">
            <div className="flex items-center gap-2">
              <Badge variant={statusColor(entry.status) as any}>
                {entry.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {entry.reason && (
              <p className="mt-1 text-sm text-muted-foreground">{entry.reason}</p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              by {entry.changedByName}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
