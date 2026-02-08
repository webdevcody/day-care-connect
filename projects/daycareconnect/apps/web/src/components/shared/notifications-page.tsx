import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@daycare-hub/ui";
import { NOTIFICATION_TYPES } from "@daycare-hub/shared";
import { useNotifications, useMarkAllNotificationsRead } from "@daycare-hub/hooks";
import { NotificationItem } from "@/components/notifications/notification-item";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/notification-templates";

export function NotificationsPageContent() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useNotifications({
    type: typeFilter !== "all" ? typeFilter : undefined,
    isRead: readFilter === "read" ? true : readFilter === "unread" ? false : undefined,
  });

  const markAllReadMutation = useMarkAllNotificationsRead();

  const allNotifications =
    data?.pages
      .flatMap((p) => p?.notifications ?? [])
      .filter((n): n is NonNullable<typeof n> => n != null && n.id != null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-muted-foreground">Stay updated on your activity.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => markAllReadMutation.mutate(undefined)}
          disabled={markAllReadMutation.isPending}
        >
          Mark all as read
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {NOTIFICATION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {NOTIFICATION_TYPE_LABELS[type].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={readFilter} onValueChange={setReadFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Read status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading notifications...</div>
          ) : allNotifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No notifications found.</div>
          ) : (
            <>
              <div className="divide-y">
                {allNotifications.map((n) => (
                  <NotificationItem key={n.id} notification={n} truncate={false} />
                ))}
              </div>
              {hasNextPage && (
                <div className="border-t py-4 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
