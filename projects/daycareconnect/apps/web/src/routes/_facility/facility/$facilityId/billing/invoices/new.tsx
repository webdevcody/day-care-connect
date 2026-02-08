import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminFacilityNav } from "@/components/admin/admin-facility-nav";
import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@daycare-hub/ui";
import { useCreateManualInvoice, useAdminBillingParents } from "@daycare-hub/hooks";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: string;
}

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/billing/invoices/new"
)({
  component: CreateInvoicePage,
});

function CreateInvoicePage() {
  const { facilityId } = Route.useParams();
  const { data: parents = [], isLoading } = useAdminBillingParents(facilityId);
  const createManualInvoice = useCreateManualInvoice();
  const navigate = Route.useNavigate();

  const [parentId, setParentId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [billingPeriodStart, setBillingPeriodStart] = useState("");
  const [billingPeriodEnd, setBillingPeriodEnd] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: "" }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, item) => {
    const price = parseFloat(item.unitPrice) || 0;
    return sum + item.quantity * price;
  }, 0);

  const tax = parseFloat(taxAmount) || 0;
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const invoice = await createManualInvoice.mutateAsync({
        facilityId,
        parentId,
        dueDate,
        billingPeriodStart: billingPeriodStart || undefined,
        billingPeriodEnd: billingPeriodEnd || undefined,
        taxAmount: taxAmount || "0",
        notes: notes || undefined,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      navigate({
        to: "/facility/$facilityId/billing/invoices/$invoiceId",
        params: { facilityId, invoiceId: invoice.id },
      });
    } catch (err: any) {
      setError(err.message || "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <AdminFacilityNav facilityId={facilityId} />

      <h1 className="mb-6 text-2xl font-bold">Create Invoice</h1>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardContent className="space-y-4 py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="parent">Parent</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent" />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="periodStart">Billing Period Start (optional)</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={billingPeriodStart}
                  onChange={(e) => setBillingPeriodStart(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="periodEnd">Billing Period End (optional)</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={billingPeriodEnd}
                  onChange={(e) => setBillingPeriodEnd(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="mb-6">
          <CardContent className="py-6">
            <h2 className="mb-4 text-lg font-semibold">Line Items</h2>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="flex-1">
                    {index === 0 && <Label>Description</Label>}
                    <Input
                      placeholder="e.g., Monthly tuition"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(index, "description", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="w-24">
                    {index === 0 && <Label>Qty</Label>}
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(index, "quantity", parseInt(e.target.value) || 1)
                      }
                      required
                    />
                  </div>
                  <div className="w-32">
                    {index === 0 && <Label>Unit Price</Label>}
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateLineItem(index, "unitPrice", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="w-28 text-right">
                    {index === 0 && <Label className="invisible">Total</Label>}
                    <p className="py-2 text-sm font-medium">
                      ${((item.quantity * (parseFloat(item.unitPrice) || 0)).toFixed(2))}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={addLineItem}
            >
              Add Line Item
            </Button>

            {/* Totals */}
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-end space-y-1">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Tax</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-24 text-right"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-between border-t pt-2 text-lg font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="mb-6">
          <CardContent className="py-6">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for the parent..."
              rows={3}
            />
          </CardContent>
        </Card>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting || !parentId || !dueDate}>
            {submitting ? "Creating..." : "Create Invoice"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({
                to: "/facility/$facilityId/billing/invoices",
                params: { facilityId },
              })
            }
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
