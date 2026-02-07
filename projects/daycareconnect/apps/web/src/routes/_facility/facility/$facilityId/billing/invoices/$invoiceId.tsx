import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AdminFacilityNav } from "@/components/admin/admin-facility-nav";
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
import { getInvoiceDetail, sendInvoice, voidInvoice } from "@/lib/server/admin-billing";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  void: "bg-gray-100 text-gray-500",
};

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/billing/invoices/$invoiceId"
)({
  loader: ({ params }) =>
    getInvoiceDetail({
      data: { invoiceId: params.invoiceId, facilityId: params.facilityId },
    }),
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const invoice = Route.useLoaderData();
  const { facilityId } = Route.useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try {
      await sendInvoice({ data: { invoiceId: invoice.id } });
      router.invalidate();
    } catch (err) {
      console.error("Failed to send invoice:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!confirm("Are you sure you want to void this invoice?")) return;
    setLoading(true);
    try {
      await voidInvoice({ data: { invoiceId: invoice.id } });
      router.invalidate();
    } catch (err) {
      console.error("Failed to void invoice:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AdminFacilityNav facilityId={facilityId} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            to="/facility/$facilityId/billing/invoices"
            params={{ facilityId }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to Invoices
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            Invoice {invoice.invoiceNumber}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={statusColors[invoice.status] || ""}>
            {invoice.status}
          </Badge>
          {invoice.status === "draft" && (
            <Button onClick={handleSend} disabled={loading}>
              {loading ? "Sending..." : "Send Invoice"}
            </Button>
          )}
          {invoice.status !== "paid" && invoice.status !== "void" && (
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={loading}
            >
              Void
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Info */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="py-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase">
              Bill To
            </h3>
            <p className="font-medium">{invoice.parentName}</p>
            <p className="text-sm text-muted-foreground">{invoice.parentEmail}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase">
              Details
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span>
                  {new Date(invoice.dueDate + "T00:00:00").toLocaleDateString()}
                </span>
              </div>
              {invoice.billingPeriodStart && invoice.billingPeriodEnd && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billing Period</span>
                  <span>
                    {new Date(invoice.billingPeriodStart + "T00:00:00").toLocaleDateString()} -{" "}
                    {new Date(invoice.billingPeriodEnd + "T00:00:00").toLocaleDateString()}
                  </span>
                </div>
              )}
              {invoice.paidAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid At</span>
                  <span>{new Date(invoice.paidAt).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card className="mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lineItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  ${parseFloat(item.unitPrice).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  ${parseFloat(item.total).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="border-t p-6">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${parseFloat(invoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>${parseFloat(invoice.taxAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>Total</span>
                <span>${parseFloat(invoice.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card className="mb-6">
          <CardContent className="py-6">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase">
              Notes
            </h3>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <Card>
          <CardContent className="py-6">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase">
              Payment History
            </h3>
            <div className="space-y-2">
              {invoice.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      ${parseFloat(payment.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    className={
                      payment.status === "succeeded"
                        ? "bg-green-100 text-green-800"
                        : payment.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                    }
                  >
                    {payment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
