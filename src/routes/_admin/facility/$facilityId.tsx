import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/facility/$facilityId")({
  component: FacilityLayout,
});

function FacilityLayout() {
  return (
    <div>
      <Outlet />
    </div>
  );
}
