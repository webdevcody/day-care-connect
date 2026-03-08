import { Link } from "@tanstack/react-router";
import { Building2, Users, ClipboardCheck, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export function SidebarNav({
  userName,
  facilityId,
}: {
  userName?: string;
  facilityId: string | null;
}) {
  const facilityNavItems = facilityId
    ? [
        { to: "/facility/$facilityId" as const, label: "Overview", icon: Building2, exact: true },
        { to: "/facility/$facilityId/children" as const, label: "Children", icon: Users },
        { to: "/facility/$facilityId/attendance" as const, label: "Attendance", icon: ClipboardCheck },
        { to: "/facility/$facilityId/guardians" as const, label: "Guardians", icon: Shield },
      ]
    : [];

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r bg-muted/30">
      <div className="p-6">
        <a href="/" className="text-xl font-bold text-primary">
          DayCareConnect
        </a>
        <p className="mt-1 text-xs text-muted-foreground">Facility Admin</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {facilityNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            params={{ facilityId: facilityId! }}
            activeOptions={{ exact: item.exact ?? false }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-3 border-t p-3">
        {userName && (
          <div className="flex items-center justify-between px-2">
            <span className="text-sm text-muted-foreground truncate">
              {userName}
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={async () => {
                await signOut();
                window.location.href = "/";
              }}
            >
              Sign Out
            </Button>
          </div>
        )}
        <ThemeToggle />
      </div>
    </aside>
  );
}
