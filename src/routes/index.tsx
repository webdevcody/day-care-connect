import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <a href="/" className="text-xl font-bold text-primary">
          DayCareConnect
        </a>
        <div className="flex items-center gap-3">
          <a href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </a>
          <a href="/register">
            <Button size="sm">Get Started</Button>
          </a>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Childcare Management
          <br />
          <span className="text-primary">Made Simple</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg text-muted-foreground">
          Manage your facilities, track attendance, and keep families connected
          — all in one place.
        </p>
        <div className="mt-8 flex gap-4">
          <a href="/register">
            <Button size="lg">Create Account</Button>
          </a>
          <a href="/login">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </a>
        </div>
      </main>
    </div>
  );
}
