import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useSession, signOut } from "@/lib/auth-client";
import { useFacility } from "@daycare-hub/hooks";
import { APP_NAME } from "@daycare-hub/shared";
import { Button } from "@daycare-hub/ui";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Activity,
  ListChecks,
  FileText,
  UserCog,
  DollarSign,
  FolderOpen,
  LinkIcon,
  BarChart3,
  Mail,
  Settings,
  TrendingUp,
  MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/_facility/facility/$facilityId")({
  component: FacilityDetailLayout,
});

const navGroups = [
  {
    label: "Overview",
    items: [
      {
        to: "/facility/$facilityId" as const,
        label: "Dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    label: "Children",
    items: [
      {
        to: "/facility/$facilityId/roster" as const,
        label: "Roster",
        icon: Users,
      },
      {
        to: "/facility/$facilityId/enrollments" as const,
        label: "Enrollments",
        icon: ListChecks,
      },
      {
        to: "/facility/$facilityId/enrollment-analytics" as const,
        label: "Enrollment Analytics",
        icon: TrendingUp,
      },
      {
        to: "/facility/$facilityId/attendance" as const,
        label: "Attendance",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    label: "Classroom",
    items: [
      {
        to: "/facility/$facilityId/activities" as const,
        label: "Activities",
        icon: Activity,
      },
      {
        to: "/facility/$facilityId/daily-reports" as const,
        label: "Daily Reports",
        icon: FileText,
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        to: "/facility/$facilityId/staff" as const,
        label: "Staff",
        icon: UserCog,
      },
      {
        to: "/facility/$facilityId/billing" as const,
        label: "Billing",
        icon: DollarSign,
      },
      {
        to: "/facility/$facilityId/documents" as const,
        label: "Documents",
        icon: FolderOpen,
      },
      {
        to: "/facility/$facilityId/invites" as const,
        label: "Invites",
        icon: LinkIcon,
      },
      {
        to: "/facility/$facilityId/emails" as const,
        label: "Email Parents",
        icon: Mail,
      },
      {
        to: "/facility/$facilityId/messages" as const,
        label: "Messages",
        icon: MessageSquare,
      },
    ],
  },
  {
    label: "Facility",
    items: [
      {
        to: "/facility/$facilityId/reports" as const,
        label: "Reports",
        icon: BarChart3,
      },
      {
        to: "/facility/$facilityId/edit" as const,
        label: "Settings",
        icon: Settings,
      },
    ],
  },
];

function FacilityDetailLayout() {
  const { facilityId } = Route.useParams();
  const { data: session } = useSession();
  const { data: facility } = useFacility(facilityId);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r bg-muted/30">
        {/* Header */}
        <div className="border-b p-4">
          <Link
            to="/facility"
            className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Facilities
          </Link>
          <a href="/" className="text-lg font-bold text-primary">
            {APP_NAME}
          </a>
          <p className="mt-1 truncate text-sm font-medium" title={facility?.name}>
            {facility?.name ?? "Loading..."}
          </p>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    params={{ facilityId }}
                    activeOptions={{ exact: "exact" in item && item.exact }}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors [&.active]:bg-accent [&.active]:text-foreground"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-3">
          <ThemeToggle />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <div />
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
