import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
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
import { getParentInvoiceDetail, createCheckoutSession } from "@/lib/server/parent-billing";

const statusColors: Record<string, string> = {
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

export const Route = createFileRoute(
  "/_parent/parent/billing/invoices/$invoiceId"
)({
  validateSearch: (search: Record<string, unknown>) => ({
    payment: search.payment as string | undefined,
  }),
  loader: ({ params }) =>
    getParentInvoiceDetail({ data: { invoiceId: params.invoiceId } }),
  component: ParentInvoiceDetail,
});

function ParentInvoiceDetail() {
  const invoice = Route.useLoaderData();
  const { payment } = Route.useSearch();
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    setPaying(true);
    try {
      const result = await createCheckoutSession({
        data: { invoiceId: invoice.id },
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error("Failed to create checkout session:", err);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div>
      <Link
        to="/parent/billing"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Billing
      </Link>

      <div className="mb-6 mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoice {invoice.invoiceNumber}</h1>
        <div className="flex items-center gap-3">
          <Badge className={statusColors[invoice.status] || ""}>
            {invoice.status}
          </Badge>
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <Button onClick={handlePay} disabled={paying}>
              {paying ? "Redirecting..." : "Pay Now"}
            </Button>
          )}
        </div>
      </div>

      {payment === "success" && (
        <div className="mb-6 rounded-md bg-green-50 p-4 text-sm text-green-800">
          Payment successful! Your invoice has been paid.
        </div>
      )}

      {payment === "cancelled" && (
        <div className="mb-6 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
          Payment was cancelled. You can try again when you're ready.
        </div>
      )}

      {/* Invoice Info */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="py-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase">
              From
            </h3>
            <p className="font-medium">{invoice.facilityName}</p>
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
                  <span className="text-muted-foreground">Period</span>
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

      {invoice.notes && (
        <Card>
          <CardContent className="py-6">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase">
              Notes
            </h3>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
