import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useSession, signOut } from "@/lib/auth-client";
import { APP_NAME } from "@daycare-hub/shared";
import { Button } from "@daycare-hub/ui";
import { MessagesNavLink } from "@/components/messaging/unread-badge";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

import { Briefcase, Bell, Settings } from "lucide-react";

export const Route = createFileRoute("/_staff")({
  component: StaffLayout,
});

function StaffLayout() {
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r bg-muted/30">
        <div className="p-6">
          <a href="/" className="text-xl font-bold text-primary">
            {APP_NAME}
          </a>
          <p className="mt-1 text-xs text-muted-foreground">Staff Dashboard</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          <Link
            to="/staff"
            activeOptions={{ exact: true }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground"
          >
            <Briefcase className="h-4 w-4" />
            My Assignments
          </Link>
          <MessagesNavLink to="/staff/messages" />
          <Link
            to="/staff/notifications"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </Link>
          <Link
            to="/staff/settings"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>
        <div className="border-t p-3">
          <ThemeToggle />
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <h2 className="text-lg font-semibold">Staff Dashboard</h2>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-muted-foreground">{session?.user?.name}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                window.location.href = "/";
              }}
            >
              Sign Out
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
