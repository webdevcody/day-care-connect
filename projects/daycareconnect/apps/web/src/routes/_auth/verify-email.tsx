import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@daycare-hub/ui";

export const Route = createFileRoute("/_auth/verify-email")({
  component: VerifyEmailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || "",
  }),
});

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    token ? "verifying" : "error"
  );

  useEffect(() => {
    if (!token) return;

    authClient.verifyEmail({ query: { token } }).then((result) => {
      if (result.error) {
        setStatus("error");
      } else {
        setStatus("success");
      }
    });
  }, [token]);

  if (status === "verifying") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifying Email</CardTitle>
          <CardDescription>Please wait...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Verified</CardTitle>
          <CardDescription>
            Your email has been verified successfully.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <a
            href="/parent"
            className="w-full text-center text-sm font-medium text-primary hover:underline"
          >
            Go to Dashboard
          </a>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Failed</CardTitle>
        <CardDescription>
          {token
            ? "This verification link is invalid or has expired."
            : "Check your email for a verification link."}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <a
          href="/login"
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Back to sign in
        </a>
      </CardFooter>
    </Card>
  );
}
