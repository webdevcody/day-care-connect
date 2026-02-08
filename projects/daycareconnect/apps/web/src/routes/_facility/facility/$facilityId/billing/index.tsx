import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, Button, Badge } from "@daycare-hub/ui";
import {
  useStripeAccountStatus,
  useCreateStripeConnectLink,
  useGetStripeDashboardLink,
  useAdminBillingOverview,
} from "@daycare-hub/hooks";

export const Route = createFileRoute("/_facility/facility/$facilityId/billing/")({
  component: BillingDashboard,
});

function BillingDashboard() {
  const { facilityId } = Route.useParams();
  const { data: stripeStatus, isLoading: stripeLoading } = useStripeAccountStatus(facilityId);
  const { data: overview, isLoading: overviewLoading } = useAdminBillingOverview(facilityId);
  const createStripeConnectLink = useCreateStripeConnectLink();
  const getStripeDashboardLink = useGetStripeDashboardLink();
  const [connecting, setConnecting] = useState(false);

  if (stripeLoading || overviewLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  if (!stripeStatus || !overview) return null;

  const handleConnectStripe = async () => {
    setConnecting(true);
    try {
      const result = await createStripeConnectLink.mutateAsync(facilityId);
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error("Failed to create Stripe connect link:", err);
    } finally {
      setConnecting(false);
    }
  };

  const handleOpenDashboard = async () => {
    try {
      const result = await getStripeDashboardLink.mutateAsync(facilityId);
      if (result.url) {
        window.open(result.url, "_blank");
      }
    } catch (err) {
      console.error("Failed to get dashboard link:", err);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Billing</h1>

      {/* Stripe Connection Status */}
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Stripe Connect</h2>
              <p className="text-sm text-muted-foreground">
                Connect your Stripe account to accept payments from parents
              </p>
            </div>
            {!stripeStatus.connected ? (
              <Button onClick={handleConnectStripe} disabled={connecting}>
                {connecting ? "Connecting..." : "Connect Stripe"}
              </Button>
            ) : !stripeStatus.isOnboarded ? (
              <div className="flex items-center gap-3">
                <Badge variant="secondary">Pending Setup</Badge>
                <Button onClick={handleConnectStripe} disabled={connecting}>
                  {connecting ? "Loading..." : "Complete Setup"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
                <Button variant="outline" onClick={handleOpenDashboard}>
                  Stripe Dashboard
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">${parseFloat(overview.totalRevenue).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold">
              ${parseFloat(overview.outstandingAmount).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {overview.outstandingCount} invoice{overview.outstandingCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-destructive">
              ${parseFloat(overview.overdueAmount).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {overview.overdueCount} invoice{overview.overdueCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link to="/facility/$facilityId/billing/invoices" params={{ facilityId }}>
          <Button variant="outline">View All Invoices</Button>
        </Link>
        <Link to="/facility/$facilityId/billing/invoices/new" params={{ facilityId }}>
          <Button>Create Invoice</Button>
        </Link>
      </div>
    </div>
  );
}
