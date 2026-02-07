import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@daycare-hub/ui";
import { markNotificationRead } from "@/lib/server/notifications";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { useSession } from "@/lib/auth-client";
import { ROLE_DASHBOARD_PATHS } from "@daycare-hub/shared";
import type { UserRole } from "@daycare-hub/shared";

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    actionUrl: string | null;
    isRead: boolean;
    createdAt: Date | string;
  };
  truncate?: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  new_message: "\u2709\uFE0F",
  enrollment_submitted: "\uD83D\uDCCB",
  enrollment_approved: "\u2705",
  enrollment_rejected: "\u274C",
  enrollment_withdrawn: "\uD83D\uDCE4",
  check_in: "\uD83D\uDFE2",
  check_out: "\uD83D\uDD34",
};

function resolveActionUrl(actionUrl: string, role: UserRole): string {
  const basePath = ROLE_DASHBOARD_PATHS[role] || "/parent";
  // If the URL already starts with a role dashboard path, use as-is
  if (
    actionUrl.startsWith("/parent/") ||
    actionUrl.startsWith("/facility/") ||
    actionUrl.startsWith("/staff/")
  ) {
    return actionUrl;
  }
  // For legacy or generic paths like /messages/..., prefix with user's dashboard
  if (actionUrl.startsWith("/messages/")) {
    return `${basePath}${actionUrl}`;
  }
  return actionUrl;
}

export function NotificationItem({ notification, truncate = true }: NotificationItemProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const role = ((session?.user as any)?.role || "parent") as UserRole;

  const markReadMutation = useMutation({
    mutationFn: () =>
      markNotificationRead({ data: { notificationId: notification.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    },
  });

  function handleClick() {
    if (!notification.isRead) {
      markReadMutation.mutate();
    }
    if (notification.actionUrl) {
      navigate({ to: resolveActionUrl(notification.actionUrl, role) });
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent",
        !notification.isRead && "bg-accent/50"
      )}
    >
      <span className="mt-0.5 text-lg leading-none">
        {TYPE_ICONS[notification.type] || "\uD83D\uDD14"}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm",
            !notification.isRead && "font-semibold"
          )}
        >
          {notification.title}
        </p>
        <p
          className={cn(
            "mt-0.5 text-xs text-muted-foreground",
            truncate && "line-clamp-2"
          )}
        >
          {notification.body}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      {!notification.isRead && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
}
