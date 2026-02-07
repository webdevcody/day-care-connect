import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@daycare-hub/ui";
import { getParentPaymentHistory } from "@/lib/server/parent-billing";

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  succeeded: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-yellow-100 text-yellow-800",
};

export const Route = createFileRoute(
  "/_parent/parent/billing/payments"
)({
  loader: () => getParentPaymentHistory(),
  component: PaymentHistoryPage,
});

function PaymentHistoryPage() {
  const paymentsList = Route.useLoaderData();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Payment History</h1>

      {paymentsList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No payments yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsList.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{payment.invoiceNumber}</TableCell>
                  <TableCell>{payment.facilityName}</TableCell>
                  <TableCell>
                    ${parseFloat(payment.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[payment.status] || ""}>
                      {payment.status}
                    </Badge>
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
