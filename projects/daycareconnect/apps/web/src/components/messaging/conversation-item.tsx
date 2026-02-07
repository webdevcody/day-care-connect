import { Link } from "@tanstack/react-router";

interface ConversationItemProps {
  id: string;
  name: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  isMuted: boolean;
  messagesBasePath?: string;
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationItem({
  id,
  name,
  lastMessage,
  lastMessageAt,
  unreadCount,
  isMuted,
  messagesBasePath = "/parent/messages",
}: ConversationItemProps) {
  return (
    <Link
      to={`${messagesBasePath}/$conversationId`}
      params={{ conversationId: id }}
      className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent [&.active]:bg-accent"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <span className="text-sm font-semibold">{name.charAt(0)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`truncate text-sm ${
              unreadCount > 0 ? "font-semibold" : "font-medium"
            }`}
          >
            {name}
            {isMuted && (
              <span className="ml-1 text-xs text-muted-foreground">(muted)</span>
            )}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(lastMessageAt)}
          </span>
        </div>
        {lastMessage && (
          <p className="truncate text-xs text-muted-foreground">{lastMessage}</p>
        )}
      </div>
      {unreadCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
