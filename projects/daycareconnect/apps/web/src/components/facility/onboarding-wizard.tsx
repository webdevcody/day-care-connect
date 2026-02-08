import { useNavigate } from "@tanstack/react-router";
import { APP_NAME } from "@daycare-hub/shared";
import { signOut } from "@/lib/auth-client";
import { Button } from "@daycare-hub/ui";
import { FacilityFormWizard } from "./facility-form-wizard";

export function OnboardingWizard() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <a href="/" className="text-xl font-bold text-primary">
            {APP_NAME}
          </a>
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

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold">Welcome! Let's set up your facility</h1>
            <p className="text-muted-foreground">
              We'll guide you through creating your first facility. This will only take a few
              minutes.
            </p>
          </div>

          <FacilityFormWizard
            onSuccess={(facility) => {
              navigate({
                to: "/facility/$facilityId",
                params: { facilityId: facility.id },
              });
            }}
          />
        </div>
      </main>
    </div>
  );
}
