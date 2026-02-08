import { Link } from "@tanstack/react-router";
import { Button, ScrollArea } from "@daycare-hub/ui";
import { useNotifications, useMarkAllNotificationsRead } from "@daycare-hub/hooks";
import { NotificationItem } from "./notification-item";
import { useSession } from "@/lib/auth-client";
import { ROLE_DASHBOARD_PATHS } from "@daycare-hub/shared";
import type { UserRole } from "@daycare-hub/shared";

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { data: session } = useSession();
  const role = ((session?.user as any)?.role || "parent") as UserRole;
  const basePath = ROLE_DASHBOARD_PATHS[role] || "/parent";

  const { data, isLoading } = useNotifications();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const items =
    data?.pages
      .flatMap((p) => p?.notifications ?? [])
      .filter((n): n is NonNullable<typeof n> => n != null && n.id != null)
      .slice(0, 3) ?? [];

  return (
    <div className="w-80 max-h-[min(500px,80vh)] flex flex-col bg-background rounded-lg">
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <h3 className="font-semibold">Notifications</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => markAllReadMutation.mutate(undefined)}
          disabled={markAllReadMutation.isPending}
        >
          Mark all read
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="divide-y">
            {items.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="border-t px-4 py-2 text-center shrink-0">
        <Link
          to={`${basePath}/notifications`}
          className="text-sm font-medium text-primary hover:underline"
          onClick={onClose}
        >
          View All
        </Link>
      </div>
    </div>
  );
}
