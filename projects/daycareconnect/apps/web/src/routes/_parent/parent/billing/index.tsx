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
import { getParentBillingSummary, getParentInvoices } from "@/lib/server/parent-billing";

const statusColors: Record<string, string> = {
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

export const Route = createFileRoute("/_parent/parent/billing/")({
  loader: async () => {
    const [summary, invoicesList] = await Promise.all([
      getParentBillingSummary(),
      getParentInvoices({ data: {} }),
    ]);
    return { summary, invoices: invoicesList };
  },
  component: ParentBillingDashboard,
});

function ParentBillingDashboard() {
  const { summary, invoices: invoicesList } = Route.useLoaderData();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Billing</h1>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p className="text-2xl font-bold">
              ${parseFloat(summary.outstandingAmount).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.outstandingCount} unpaid invoice{summary.outstandingCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-2xl font-bold">
              ${parseFloat(summary.totalPaid).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        {summary.nextDueInvoice && (
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

      {invoicesList.length === 0 ? (
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
              {invoicesList.map((inv) => (
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
