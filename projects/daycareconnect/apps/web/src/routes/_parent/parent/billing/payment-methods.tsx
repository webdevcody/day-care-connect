import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, Button, Badge } from "@daycare-hub/ui";
import {
  useParentPaymentMethods,
  useRemovePaymentMethod,
  useSetDefaultPaymentMethod,
} from "@daycare-hub/hooks";

export const Route = createFileRoute(
  "/_parent/parent/billing/payment-methods"
)({
  component: PaymentMethodsPage,
});

function PaymentMethodsPage() {
  const { data: methods, isLoading } = useParentPaymentMethods();
  const removeMutation = useRemovePaymentMethod();
  const setDefaultMutation = useSetDefaultPaymentMethod();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  const paymentMethods = methods ?? [];

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this payment method?")) return;
    setLoadingId(id);
    try {
      await removeMutation.mutateAsync(id);
    } catch (err) {
      console.error("Failed to remove payment method:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setLoadingId(id);
    try {
      await setDefaultMutation.mutateAsync(id);
    } catch (err) {
      console.error("Failed to set default:", err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Payment Methods</h1>

      <p className="mb-6 text-sm text-muted-foreground">
        Payment methods are saved automatically when you pay via Stripe Checkout.
      </p>

      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No saved payment methods. A payment method will be saved after your
              first payment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <Card key={method.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-16 items-center justify-center rounded bg-muted text-xs font-medium uppercase">
                    {method.cardBrand || "Card"}
                  </div>
                  <div>
                    <p className="font-medium">
                      •••• •••• •••• {method.cardLast4}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires {method.cardExpMonth}/{method.cardExpYear}
                    </p>
                  </div>
                  {method.isDefault && (
                    <Badge className="bg-blue-100 text-blue-800">Default</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {!method.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                      disabled={loadingId === method.id}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(method.id)}
                    disabled={loadingId === method.id}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
