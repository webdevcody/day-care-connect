import { createFileRoute } from "@tanstack/react-router";
import { getStripe } from "@/lib/stripe";
import {
  db,
  invoices,
  payments,
  stripeAccounts,
  eq,
} from "@daycare-hub/db";
import { sendNotification } from "@/lib/server/notification-service";

async function handleCheckoutCompleted(session: any) {
  const invoiceId = session.metadata?.invoiceId;
  const parentId = session.metadata?.parentId;

  if (!invoiceId || !parentId) return;

  // Mark invoice as paid
  await db
    .update(invoices)
    .set({
      status: "paid",
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  // Create payment record
  await db.insert(payments).values({
    invoiceId,
    parentId,
    amount: (session.amount_total / 100).toFixed(2),
    stripePaymentIntentId: session.payment_intent,
    status: "succeeded",
  });

  // Get invoice details for notification
  const [invoice] = await db
    .select({
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (invoice) {
    await sendNotification({
      type: "payment_received",
      recipientId: parentId,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.total,
      },
      actionUrl: `/parent/billing/invoices/${invoiceId}`,
    });
  }
}

async function handleAccountUpdated(account: any) {
  const isOnboarded =
    account.charges_enabled && account.details_submitted;

  await db
    .update(stripeAccounts)
    .set({
      isOnboarded,
      updatedAt: new Date(),
    })
    .where(eq(stripeAccounts.stripeAccountId, account.id));
}

export const Route = createFileRoute("/api/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const stripe = getStripe();
        const body = await request.text();
        const sig = request.headers.get("stripe-signature");

        if (!sig) {
          return new Response("Missing stripe-signature header", { status: 400 });
        }

        let event;
        try {
          event = stripe.webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
          );
        } catch (err: any) {
          console.error("Webhook signature verification failed:", err.message);
          return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        try {
          switch (event.type) {
            case "checkout.session.completed":
              await handleCheckoutCompleted(event.data.object);
              break;
            case "account.updated":
              await handleAccountUpdated(event.data.object);
              break;
            default:
              // Unhandled event type
              break;
          }
        } catch (err: any) {
          console.error(`Error handling ${event.type}:`, err);
          return new Response("Webhook handler error", { status: 500 });
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
