import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, Button, Badge } from "@daycare-hub/ui";
import {
  getParentPaymentMethods,
  removePaymentMethod,
  setDefaultPaymentMethod,
} from "@/lib/server/parent-billing";

export const Route = createFileRoute(
  "/_parent/parent/billing/payment-methods"
)({
  loader: () => getParentPaymentMethods(),
  component: PaymentMethodsPage,
});

function PaymentMethodsPage() {
  const methods = Route.useLoaderData();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this payment method?")) return;
    setLoading(id);
    try {
      await removePaymentMethod({ data: { paymentMethodId: id } });
      router.invalidate();
    } catch (err) {
      console.error("Failed to remove payment method:", err);
    } finally {
      setLoading(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setLoading(id);
    try {
      await setDefaultPaymentMethod({ data: { paymentMethodId: id } });
      router.invalidate();
    } catch (err) {
      console.error("Failed to set default:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Payment Methods</h1>

      <p className="mb-6 text-sm text-muted-foreground">
        Payment methods are saved automatically when you pay via Stripe Checkout.
      </p>

      {methods.length === 0 ? (
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
          {methods.map((method) => (
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
                      disabled={loading === method.id}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(method.id)}
                    disabled={loading === method.id}
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
