import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { getMyFacility } from "@/server/facilities";
import { SidebarNav } from "@/components/sidebar-nav";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { data: session, isPending } = useSession();
  const [facility, setFacility] = useState<{ id: string } | null | undefined>(undefined);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) return;
    getMyFacility().then((f) => setFacility(f));
  }, [session]);

  useEffect(() => {
    if (facility === undefined) return;
    const isSetupRoute = location.pathname === "/facility/setup";
    if (!facility && !isSetupRoute) {
      navigate({ to: "/facility/setup" });
    }
  }, [facility, location.pathname, navigate]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    window.location.href = "/login";
    return null;
  }

  const isSetupRoute = location.pathname === "/facility/setup";

  return (
    <div className="flex min-h-screen">
      {!isSetupRoute && (
        <SidebarNav
          userName={session.user?.name}
          facilityId={facility?.id ?? null}
        />
      )}
      <main
        className={
          isSetupRoute
            ? "flex-1 flex items-center justify-center p-6"
            : "flex-1 p-6"
        }
      >
        <Outlet />
      </main>
    </div>
  );
}
