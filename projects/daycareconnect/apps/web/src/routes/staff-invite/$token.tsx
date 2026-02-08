import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { APP_NAME } from "@daycare-hub/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@daycare-hub/ui";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const Route = createFileRoute("/staff-invite/$token")({
  component: StaffInvitePage,
});

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StaffInvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [inviteInfo, setInviteInfo] = useState<{
    facilityName: string;
    staffRole: string;
    expiresAt: string | null;
  } | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchInviteInfo() {
      try {
        const res = await fetch(`${API_URL}/api/staff-invite/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setInviteError(data.error || "Invalid invite link");
        } else {
          setInviteInfo(data);
        }
      } catch {
        setInviteError("Failed to load invite information");
      } finally {
        setLoadingInfo(false);
      }
    }
    fetchInviteInfo();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/staff-invite/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to accept invite");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <a href="/" className="text-2xl font-bold text-primary">
              {APP_NAME}
            </a>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Invalid Invite</CardTitle>
              <CardDescription>{inviteError}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/login" })}>
                Go to Login
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <a href="/" className="text-2xl font-bold text-primary">
              {APP_NAME}
            </a>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>You're All Set!</CardTitle>
              <CardDescription>
                You've been added as{" "}
                <strong>{formatRole(inviteInfo?.staffRole || "")}</strong> at{" "}
                <strong>{inviteInfo?.facilityName}</strong>. You can now log in
                with your credentials.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button className="w-full" onClick={() => navigate({ to: "/login" })}>
                Sign In
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="text-2xl font-bold text-primary">
            {APP_NAME}
          </a>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Join as Staff</CardTitle>
            <CardDescription>
              You've been invited to join{" "}
              <strong>{inviteInfo?.facilityName}</strong> as a{" "}
              <strong>{formatRole(inviteInfo?.staffRole || "")}</strong>. Create
              your account to get started.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account & Join"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <a href="/login" className="text-foreground hover:underline">
                  Sign in
                </a>{" "}
                first, then use this link again.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
