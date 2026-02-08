import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@daycare-hub/ui";
import { useParentBillingSummary, useParentInvoices } from "@daycare-hub/hooks";

const statusColors: Record<string, string> = {
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

export const Route = createFileRoute("/_parent/parent/billing/")({
  component: ParentBillingDashboard,
});

function ParentBillingDashboard() {
  const { data: summary, isLoading: summaryLoading } = useParentBillingSummary();
  const { data: invoicesList, isLoading: invoicesLoading } = useParentInvoices();

  const isLoading = summaryLoading || invoicesLoading;

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  const invoices = invoicesList ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Billing</h1>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p className="text-2xl font-bold">
              ${parseFloat(summary?.outstandingAmount ?? "0").toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary?.outstandingCount ?? 0} unpaid invoice{summary?.outstandingCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-2xl font-bold">
              ${parseFloat(summary?.totalPaid ?? "0").toFixed(2)}
            </p>
          </CardContent>
        </Card>
        {summary?.nextDueInvoice && (
          <Card>
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">Next Payment Due</p>
              <p className="text-2xl font-bold">
                ${parseFloat(summary.nextDueInvoice.total).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Due{" "}
                {new Date(
                  summary.nextDueInvoice.dueDate + "T00:00:00"
                ).toLocaleDateString()}{" "}
                &middot; {summary.nextDueInvoice.facilityName}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Nav */}
      <div className="mb-6 flex gap-3">
        <Link to="/parent/billing/payments">
          <Button variant="outline">Payment History</Button>
        </Link>
        <Link to="/parent/billing/payment-methods">
          <Button variant="outline">Payment Methods</Button>
        </Link>
      </div>

      {/* Invoice List */}
      <h2 className="mb-4 text-lg font-semibold">Invoices</h2>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No invoices yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link
                      to="/parent/billing/invoices/$invoiceId"
                      params={{ invoiceId: inv.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{inv.facilityName}</TableCell>
                  <TableCell>${parseFloat(inv.total).toFixed(2)}</TableCell>
                  <TableCell>
                    {new Date(inv.dueDate + "T00:00:00").toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[inv.status] || ""}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(inv.status === "sent" || inv.status === "overdue") && (
                      <Link
                        to="/parent/billing/invoices/$invoiceId"
                        params={{ invoiceId: inv.id }}
                      >
                        <Button size="sm">Pay Now</Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
