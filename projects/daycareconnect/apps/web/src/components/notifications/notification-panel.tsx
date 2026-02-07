import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, ScrollArea } from "@daycare-hub/ui";
import { getNotifications, markAllNotificationsRead } from "@/lib/server/notifications";
import { NotificationItem } from "./notification-item";
import { useSession } from "@/lib/auth-client";
import { ROLE_DASHBOARD_PATHS } from "@daycare-hub/shared";
import type { UserRole } from "@daycare-hub/shared";

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const role = ((session?.user as any)?.role || "parent") as UserRole;
  const basePath = ROLE_DASHBOARD_PATHS[role] || "/parent";

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "panel"],
    queryFn: () => getNotifications({ data: { limit: 20 } }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    },
  });

  const items = data?.notifications ?? [];

  return (
    <div className="w-80 bg-background rounded-lg">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Notifications</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
        >
          Mark all read
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No notifications yet
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {items.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="border-t px-4 py-2 text-center">
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
