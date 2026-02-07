import { Link } from "@tanstack/react-router";

const tabs = [
  { to: "/facility/$facilityId/edit" as const, label: "Basic Info" },
  { to: "/facility/$facilityId/hours" as const, label: "Hours" },
  { to: "/facility/$facilityId/photos" as const, label: "Photos" },
  { to: "/facility/$facilityId/staff" as const, label: "Staff" },
  { to: "/facility/$facilityId/services" as const, label: "Services" },
];

export function FacilitySubNav({ facilityId }: { facilityId: string }) {
  return (
    <nav className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          params={{ facilityId }}
          className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground [&.active]:bg-background [&.active]:text-foreground [&.active]:shadow-sm"
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
