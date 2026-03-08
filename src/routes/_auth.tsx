import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="text-2xl font-bold text-primary">
            DayCareConnect
          </a>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
