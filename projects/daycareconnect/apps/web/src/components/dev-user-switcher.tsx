import { useState, useEffect } from "react";
import { Button } from "@daycare-hub/ui";
import { signIn, useSession } from "@/lib/auth-client";
import { ROLE_DASHBOARD_PATHS } from "@daycare-hub/shared";
import type { UserRole } from "@daycare-hub/shared";

const SEED_USERS = [
  { label: "Parent", email: "parent@example.com", role: "parent" as const },
  { label: "Admin", email: "facility@example.com", role: "admin" as const },
  { label: "Staff", email: "staff@example.com", role: "staff" as const },
];

export function DevUserSwitcher() {
  const [open, setOpen] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const { data: session, isPending } = useSession();

  if (!import.meta.env.DEV) return null;

  // Handle redirect after page reload (fallback for cases where direct redirect didn't work)
  useEffect(() => {
    const redirectPath = sessionStorage.getItem("devLoginRedirect");

    // Only handle redirect if we have both the path and a valid session
    if (redirectPath && !isPending && session) {
      sessionStorage.removeItem("devLoginRedirect");
      window.location.href = redirectPath;
    }
  }, [session, isPending]);

  async function handleLogin(email: string, role: "parent" | "admin" | "staff") {
    setLoadingEmail(email);
    try {
      const result = await signIn.email({ email, password: "12345678" });

      if (result.error) {
        console.error("Login error:", result.error);
        setLoadingEmail(null);
        return;
      }

      // Wait a moment for the session cookie to be set, then redirect
      // This avoids the need for a page reload
      await new Promise((resolve) => setTimeout(resolve, 300));

      const redirectPath = ROLE_DASHBOARD_PATHS[role];
      window.location.href = redirectPath;
    } catch (error) {
      console.error("Login failed:", error);
      setLoadingEmail(null);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col gap-1 rounded-lg border bg-background p-2 shadow-lg">
          {SEED_USERS.map((user) => (
            <Button
              key={user.email}
              variant="ghost"
              size="sm"
              disabled={loadingEmail !== null}
              onClick={() => handleLogin(user.email, user.role)}
            >
              {loadingEmail === user.email ? "Signing in..." : `${user.label} (${user.email})`}
            </Button>
          ))}
        </div>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(!open)}
        className="opacity-70 hover:opacity-100"
      >
        {open ? "Close" : "Dev Login"}
      </Button>
    </div>
  );
}
