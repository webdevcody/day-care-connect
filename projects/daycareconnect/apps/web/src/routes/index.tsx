import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME, ROLE_DASHBOARD_PATHS } from "@daycare-hub/shared";
import type { UserRole } from "@daycare-hub/shared";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@daycare-hub/ui";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: session, isPending } = useSession();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-xl font-bold text-primary">{APP_NAME}</span>
          <div className="flex items-center gap-4">
            {isPending ? null : session ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {session.user.name}
                </span>
                <a
                  href={ROLE_DASHBOARD_PATHS[(session.user as any).role as UserRole] || "/parent"}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Dashboard
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await signOut();
                    window.location.reload();
                  }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Login
                </a>
                <a
                  href="/register"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Register
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          {APP_NAME}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          The modern platform for managing daycare facilities. Connect parents with quality
          childcare, streamline enrollment, and simplify daily operations.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <a
            href="/register"
            className="rounded-md bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Get Started
          </a>
          <a
            href="/discover"
            className="rounded-md border border-border px-8 py-3 text-base font-semibold text-foreground hover:bg-accent"
          >
            Discover Facilities
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
