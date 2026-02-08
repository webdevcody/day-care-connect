import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
import { useAdminInvoices, useSendInvoice, useVoidInvoice } from "@daycare-hub/hooks";

const STATUS_TABS = ["all", "draft", "sent", "paid", "overdue", "void"] as const;

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  void: "bg-gray-100 text-gray-500",
};

export const Route = createFileRoute("/_facility/facility/$facilityId/billing/invoices/")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: (search.status as string) || "all",
  }),
  component: InvoiceListPage,
});

function InvoiceListPage() {
  const { facilityId } = Route.useParams();
  const { status: activeTab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const statusFilter = activeTab === "all" ? undefined : activeTab;
  const { data: invoicesList = [], isLoading } = useAdminInvoices(facilityId, statusFilter);
  const sendInvoice = useSendInvoice();
  const voidInvoice = useVoidInvoice();
  const [loading, setLoading] = useState<string | null>(null);

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );

  const handleSend = async (invoiceId: string) => {
    setLoading(invoiceId);
    try {
      await sendInvoice.mutateAsync(invoiceId);
    } catch (err) {
      console.error("Failed to send invoice:", err);
    } finally {
      setLoading(null);
    }
  };

  const handleVoid = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to void this invoice?")) return;
    setLoading(invoiceId);
    try {
      await voidInvoice.mutateAsync(invoiceId);
    } catch (err) {
      console.error("Failed to void invoice:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Link to="/facility/$facilityId/billing/invoices/new" params={{ facilityId }}>
          <Button>Create Invoice</Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => navigate({ search: { status: tab } })}
            className={`rounded-md px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {invoicesList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No invoices found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Parent</TableHead>
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
                      to="/facility/$facilityId/billing/invoices/$invoiceId"
                      params={{ facilityId, invoiceId: inv.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{inv.parentName}</div>
                    <div className="text-xs text-muted-foreground">{inv.parentEmail}</div>
                  </TableCell>
                  <TableCell>${parseFloat(inv.total).toFixed(2)}</TableCell>
                  <TableCell>{new Date(inv.dueDate + "T00:00:00").toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[inv.status] || ""}>{inv.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {inv.status === "draft" && (
                        <Button
                          size="sm"
                          onClick={() => handleSend(inv.id)}
                          disabled={loading === inv.id}
                        >
                          {loading === inv.id ? "Sending..." : "Send"}
                        </Button>
                      )}
                      {inv.status !== "paid" && inv.status !== "void" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleVoid(inv.id)}
                          disabled={loading === inv.id}
                        >
                          Void
                        </Button>
                      )}
                    </div>
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
