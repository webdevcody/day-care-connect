import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/unauthorized")({
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-destructive">403</h1>
      <p className="mt-4 text-xl text-muted-foreground">
        You don't have permission to access this page.
      </p>
      <a
        href="/"
        className="mt-8 rounded-md bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
      >
        Go Home
      </a>
    </div>
  );
}
