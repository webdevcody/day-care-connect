import { Link } from "@tanstack/react-router";

const tabs = [
  { to: "/facility/$facilityId" as const, label: "Dashboard" },
  { to: "/facility/$facilityId/enrollments" as const, label: "Enrollments" },
  { to: "/facility/$facilityId/attendance" as const, label: "Attendance" },
  { to: "/facility/$facilityId/activities" as const, label: "Activities" },
  { to: "/facility/$facilityId/roster" as const, label: "Roster" },
  { to: "/facility/$facilityId/daily-reports" as const, label: "Daily Reports" },
  { to: "/facility/$facilityId/reports" as const, label: "Reports" },
  { to: "/facility/$facilityId/reviews" as const, label: "Reviews" },
  { to: "/facility/$facilityId/documents" as const, label: "Documents" },
  { to: "/facility/$facilityId/billing" as const, label: "Billing" },
  { to: "/facility/$facilityId/edit" as const, label: "Settings" },
];

export function AdminFacilityNav({ facilityId }: { facilityId: string }) {
  return (
    <nav className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          params={{ facilityId }}
          className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground [&.active]:bg-background [&.active]:text-foreground [&.active]:shadow-sm"
          activeOptions={{ exact: tab.to === "/facility/$facilityId" }}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
