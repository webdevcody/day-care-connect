import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_parent")({
  component: ParentLayout,
});

function ParentLayout() {
  const { data: session, isPending } = useSession();

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

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <a href="/" className="text-xl font-bold text-primary">
          DayCareConnect
        </a>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {session.user?.name}
          </span>
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
      <main className="p-6">
        <Outlet />
      </main>
      <div className="fixed bottom-4 right-4">
        <ThemeToggle />
      </div>
    </div>
  );
}
