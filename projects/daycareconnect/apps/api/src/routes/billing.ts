import { Hono } from "hono";
import {
  db,
  invoices,
  invoiceLineItems,
  payments,
  paymentMethods,
  stripeAccounts,
  facilities,
  eq,
  and,
  desc,
  sql,
} from "@daycare-hub/db";
import { getStripe } from "../lib/stripe";

const app = new Hono();

app.get("/invoices", async (c) => {
  const userId = c.get("userId") as string;
  const status = c.req.query("status");

  const conditions: any[] = [
    eq(invoices.parentId, userId),
    sql`${invoices.status} IN ('sent', 'paid', 'overdue')`,
  ];

  if (status) {
    conditions.push(eq(invoices.status, status));
  }

  const result = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      subtotal: invoices.subtotal,
      taxAmount: invoices.taxAmount,
      total: invoices.total,
      dueDate: invoices.dueDate,
      billingPeriodStart: invoices.billingPeriodStart,
      billingPeriodEnd: invoices.billingPeriodEnd,
      paidAt: invoices.paidAt,
      notes: invoices.notes,
      createdAt: invoices.createdAt,
      facilityId: invoices.facilityId,
      facilityName: facilities.name,
    })
    .from(invoices)
    .innerJoin(facilities, eq(invoices.facilityId, facilities.id))
    .where(and(...conditions))
    .orderBy(desc(invoices.createdAt));

  return c.json(result);
});

app.get("/invoices/:invoiceId", async (c) => {
  const userId = c.get("userId") as string;
  const invoiceId = c.req.param("invoiceId");

  const [invoice] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      subtotal: invoices.subtotal,
      taxAmount: invoices.taxAmount,
      total: invoices.total,
      dueDate: invoices.dueDate,
      billingPeriodStart: invoices.billingPeriodStart,
      billingPeriodEnd: invoices.billingPeriodEnd,
      paidAt: invoices.paidAt,
      notes: invoices.notes,
      createdAt: invoices.createdAt,
      facilityId: invoices.facilityId,
      facilityName: facilities.name,
    })
    .from(invoices)
    .innerJoin(facilities, eq(invoices.facilityId, facilities.id))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.parentId, userId)))
    .limit(1);

  if (!invoice) {
    return c.json({ error: "Invoice not found" }, 404);
  }

  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId))
    .orderBy(invoiceLineItems.sortOrder);

  return c.json({ ...invoice, lineItems });
});

app.post("/invoices/:invoiceId/checkout", async (c) => {
  const userId = c.get("userId") as string;
  const invoiceId = c.req.param("invoiceId");

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.parentId, userId)))
    .limit(1);

  if (!invoice) {
    return c.json({ error: "Invoice not found" }, 404);
  }

  if (invoice.status !== "sent" && invoice.status !== "overdue") {
    return c.json({ error: "Invoice is not payable" }, 400);
  }

  // Get facility's Stripe account
  const [stripeAccount] = await db
    .select()
    .from(stripeAccounts)
    .where(eq(stripeAccounts.facilityId, invoice.facilityId))
    .limit(1);

  if (!stripeAccount || !stripeAccount.isOnboarded) {
    return c.json({ error: "Facility has not set up payments" }, 400);
  }

  // Get line items
  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId))
    .orderBy(invoiceLineItems.sortOrder);

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.description,
        },
        unit_amount: Math.round(parseFloat(item.unitPrice) * 100),
      },
      quantity: item.quantity,
    })),
    payment_intent_data: {
      application_fee_amount: Math.round(parseFloat(invoice.total) * 2.9 + 30), // 2.9% + $0.30
      transfer_data: {
        destination: stripeAccount.stripeAccountId,
      },
    },
    success_url: `${process.env.WEB_URL}/billing/invoices/${invoiceId}?success=true`,
    cancel_url: `${process.env.WEB_URL}/billing/invoices/${invoiceId}?canceled=true`,
    metadata: {
      invoiceId,
      parentId: userId,
    },
  });

  // Save checkout session ID on invoice
  await db
    .update(invoices)
    .set({ stripeCheckoutSessionId: session.id, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));

  return c.json({ url: session.url });
});

app.get("/payments", async (c) => {
  const userId = c.get("userId") as string;

  const result = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      status: payments.status,
      stripePaymentIntentId: payments.stripePaymentIntentId,
      createdAt: payments.createdAt,
      invoiceId: payments.invoiceId,
      invoiceNumber: invoices.invoiceNumber,
      facilityName: facilities.name,
      facilityId: invoices.facilityId,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(facilities, eq(invoices.facilityId, facilities.id))
    .where(eq(payments.parentId, userId))
    .orderBy(desc(payments.createdAt));

  return c.json(result);
});

app.get("/payment-methods", async (c) => {
  const userId = c.get("userId") as string;

  const result = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId))
    .orderBy(desc(paymentMethods.createdAt));

  return c.json(result);
});

app.delete("/payment-methods/:paymentMethodId", async (c) => {
  const userId = c.get("userId") as string;
  const paymentMethodId = c.req.param("paymentMethodId");

  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, paymentMethodId), eq(paymentMethods.userId, userId)))
    .limit(1);

  if (!method) {
    return c.json({ error: "Payment method not found" }, 404);
  }

  // Detach from Stripe
  const stripe = getStripe();
  await stripe.paymentMethods.detach(method.stripePaymentMethodId);

  // Delete from DB
  await db.delete(paymentMethods).where(eq(paymentMethods.id, paymentMethodId));

  return c.json({ success: true });
});

app.post("/payment-methods/:paymentMethodId/default", async (c) => {
  const userId = c.get("userId") as string;
  const paymentMethodId = c.req.param("paymentMethodId");

  // Verify ownership
  const [method] = await db
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, paymentMethodId), eq(paymentMethods.userId, userId)))
    .limit(1);

  if (!method) {
    return c.json({ error: "Payment method not found" }, 404);
  }

  // Unset all defaults for user
  await db
    .update(paymentMethods)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(paymentMethods.userId, userId));

  // Set the specified one as default
  await db
    .update(paymentMethods)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(paymentMethods.id, paymentMethodId));

  return c.json({ success: true });
});

app.get("/summary", async (c) => {
  const userId = c.get("userId") as string;

  const [outstanding] = await db
    .select({
      amount: sql<string>`COALESCE(sum(${invoices.total}::numeric), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.parentId, userId),
        sql`${invoices.status} IN ('sent', 'overdue')`
      )
    );

  const [paid] = await db
    .select({
      total: sql<string>`COALESCE(sum(${invoices.total}::numeric), 0)`,
    })
    .from(invoices)
    .where(and(eq(invoices.parentId, userId), eq(invoices.status, "paid")));

  const [nextDue] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      dueDate: invoices.dueDate,
      facilityName: facilities.name,
    })
    .from(invoices)
    .innerJoin(facilities, eq(invoices.facilityId, facilities.id))
    .where(
      and(
        eq(invoices.parentId, userId),
        sql`${invoices.status} IN ('sent', 'overdue')`
      )
    )
    .orderBy(invoices.dueDate)
    .limit(1);

  return c.json({
    outstandingAmount: outstanding?.amount ?? "0",
    outstandingCount: outstanding?.count ?? 0,
    totalPaid: paid?.total ?? "0",
    nextDueInvoice: nextDue || null,
  });
});

export { app as billingRoutes };
