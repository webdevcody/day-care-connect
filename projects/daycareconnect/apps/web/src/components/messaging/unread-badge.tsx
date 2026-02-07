import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getUnreadCount } from "@/lib/server/messaging";
import { MessageSquare } from "lucide-react";

export function MessagesNavLink({ to = "/parent/messages" }: { to?: string }) {
  const { data } = useQuery({
    queryKey: ["unread-messages-count"],
    queryFn: () => getUnreadCount(),
    refetchInterval: 30_000,
  });

  const count = data?.count ?? 0;

  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground"
    >
      <span className="flex items-center gap-3">
        <MessageSquare className="h-4 w-4" />
        Messages
      </span>
      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
