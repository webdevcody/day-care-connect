import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getMyFacility } from "@/server/facilities";

export const Route = createFileRoute("/_admin/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();

  useEffect(() => {
    getMyFacility().then((facility) => {
      if (facility) {
        navigate({
          to: "/facility/$facilityId",
          params: { facilityId: facility.id },
        });
      } else {
        navigate({ to: "/facility/setup" });
      }
    });
  }, [navigate]);

  return (
    <div className="text-muted-foreground">Loading...</div>
  );
}
