import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import {
  db,
  invoices,
  invoiceLineItems,
  payments,
  paymentMethods,
  stripeAccounts,
  facilities,
  users,
  eq,
  and,
  desc,
  sql,
} from "@daycare-hub/db";
import { getStripe } from "../stripe";

export const getParentInvoices = createServerFn({ method: "GET" })
  .inputValidator((data: { status?: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const conditions = [eq(invoices.parentId, session.user.id)];
    // Only show sent/paid/overdue to parents (not drafts or voided)
    if (data.status && data.status !== "all") {
      conditions.push(eq(invoices.status, data.status as any));
    } else {
      conditions.push(
        sql`${invoices.status} in ('sent', 'paid', 'overdue')`
      );
    }

    return db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        total: invoices.total,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        createdAt: invoices.createdAt,
        facilityName: facilities.name,
      })
      .from(invoices)
      .innerJoin(facilities, eq(invoices.facilityId, facilities.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt));
  });

export const getParentInvoiceDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { invoiceId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

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
      .where(
        and(eq(invoices.id, data.invoiceId), eq(invoices.parentId, session.user.id))
      )
      .limit(1);

    if (!invoice) throw new Error("Invoice not found");

    const lineItemsList = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, data.invoiceId))
      .orderBy(invoiceLineItems.sortOrder);

    return { ...invoice, lineItems: lineItemsList };
  });

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: { invoiceId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.id, data.invoiceId), eq(invoices.parentId, session.user.id))
      )
      .limit(1);

    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status !== "sent" && invoice.status !== "overdue") {
      throw new Error("Invoice is not payable");
    }

    // Get facility's Stripe connected account
    const [stripeAccount] = await db
      .select()
      .from(stripeAccounts)
      .where(eq(stripeAccounts.facilityId, invoice.facilityId))
      .limit(1);

    if (!stripeAccount || !stripeAccount.isOnboarded) {
      throw new Error("Facility is not set up to accept payments");
    }

    // Get line items for the checkout session
    const lineItemsList = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, data.invoiceId))
      .orderBy(invoiceLineItems.sortOrder);

    const stripe = getStripe();

    const checkoutLineItems = lineItemsList.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.description,
        },
        unit_amount: Math.round(parseFloat(item.unitPrice) * 100),
      },
      quantity: item.quantity,
    }));

    // Add tax as a line item if present
    const taxAmount = parseFloat(invoice.taxAmount || "0");
    if (taxAmount > 0) {
      checkoutLineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Tax",
          },
          unit_amount: Math.round(taxAmount * 100),
        },
        quantity: 1,
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: checkoutLineItems,
        success_url: `${process.env.BETTER_AUTH_URL}/parent/billing/invoices/${invoice.id}?payment=success`,
        cancel_url: `${process.env.BETTER_AUTH_URL}/parent/billing/invoices/${invoice.id}?payment=cancelled`,
        metadata: {
          invoiceId: invoice.id,
          parentId: session.user.id,
        },
        customer_email: session.user.email,
      },
      {
        stripeAccount: stripeAccount.stripeAccountId,
      }
    );

    // Save checkout session ID on invoice
    await db
      .update(invoices)
      .set({
        stripeCheckoutSessionId: checkoutSession.id,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, data.invoiceId));

    return { url: checkoutSession.url };
  });

export const getParentPaymentHistory = createServerFn({ method: "GET" })
  .handler(async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    return db
      .select({
        id: payments.id,
        amount: payments.amount,
        status: payments.status,
        createdAt: payments.createdAt,
        invoiceNumber: invoices.invoiceNumber,
        facilityName: facilities.name,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .innerJoin(facilities, eq(invoices.facilityId, facilities.id))
      .where(eq(payments.parentId, session.user.id))
      .orderBy(desc(payments.createdAt));
  });

export const getParentPaymentMethods = createServerFn({ method: "GET" })
  .handler(async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    return db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, session.user.id))
      .orderBy(desc(paymentMethods.createdAt));
  });

export const removePaymentMethod = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentMethodId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [method] = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.id, data.paymentMethodId),
          eq(paymentMethods.userId, session.user.id)
        )
      )
      .limit(1);

    if (!method) throw new Error("Payment method not found");

    // Detach from Stripe
    const stripe = getStripe();
    try {
      await stripe.paymentMethods.detach(method.stripePaymentMethodId);
    } catch {
      // Ignore if already detached
    }

    await db.delete(paymentMethods).where(eq(paymentMethods.id, data.paymentMethodId));

    return { success: true };
  });

export const setDefaultPaymentMethod = createServerFn({ method: "POST" })
  .inputValidator((data: { paymentMethodId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    // Unset all defaults for this user
    await db
      .update(paymentMethods)
      .set({ isDefault: false })
      .where(eq(paymentMethods.userId, session.user.id));

    // Set the new default
    const [updated] = await db
      .update(paymentMethods)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(
        and(
          eq(paymentMethods.id, data.paymentMethodId),
          eq(paymentMethods.userId, session.user.id)
        )
      )
      .returning();

    if (!updated) throw new Error("Payment method not found");

    return updated;
  });

export const getParentBillingSummary = createServerFn({ method: "GET" })
  .handler(async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [outstanding] = await db
      .select({
        total: sql<string>`coalesce(sum(${invoices.total}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.parentId, session.user.id),
          sql`${invoices.status} in ('sent', 'overdue')`
        )
      );

    const [totalPaid] = await db
      .select({
        total: sql<string>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.parentId, session.user.id),
          eq(payments.status, "succeeded")
        )
      );

    // Get next due invoice
    const [nextDue] = await db
      .select({
        id: invoices.id,
        total: invoices.total,
        dueDate: invoices.dueDate,
        facilityName: facilities.name,
      })
      .from(invoices)
      .innerJoin(facilities, eq(invoices.facilityId, facilities.id))
      .where(
        and(
          eq(invoices.parentId, session.user.id),
          sql`${invoices.status} in ('sent', 'overdue')`
        )
      )
      .orderBy(invoices.dueDate)
      .limit(1);

    return {
      outstandingAmount: outstanding?.total || "0",
      outstandingCount: outstanding?.count || 0,
      totalPaid: totalPaid?.total || "0",
      nextDueInvoice: nextDue || null,
    };
  });
