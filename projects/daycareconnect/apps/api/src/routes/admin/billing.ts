import { Hono } from "hono";
import {
  db,
  billingPlans,
  invoices,
  invoiceLineItems,
  payments,
  enrollments,
  children,
  users,
  facilities,
  eq,
  and,
  desc,
  sql,
} from "@daycare-hub/db";
import { assertFacilityManager } from "../../lib/facility-auth";
import { sendNotification } from "../../lib/notification-service";

const app = new Hono();

async function generateInvoiceNumber(facilityId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const [result] = await db
    .select({
      maxNum: sql<string>`max(${invoices.invoiceNumber})`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.facilityId, facilityId),
        sql`${invoices.invoiceNumber} like ${prefix + "%"}`
      )
    );

  const maxNum = result?.maxNum;
  if (!maxNum) return `${prefix}0001`;

  const lastNum = parseInt(maxNum.replace(prefix, ""), 10);
  return `${prefix}${String(lastNum + 1).padStart(4, "0")}`;
}

// POST /plans - Create a billing plan
app.post("/plans", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { enrollmentId, amount, frequency, autoPay, nextInvoiceDate } = body;

  // Verify enrollment exists and user manages the facility
  const [enrollment] = await db
    .select({ id: enrollments.id, facilityId: enrollments.facilityId })
    .from(enrollments)
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment) throw new Error("Enrollment not found");
  await assertFacilityManager(enrollment.facilityId, userId);

  const [plan] = await db
    .insert(billingPlans)
    .values({
      enrollmentId,
      amount,
      frequency,
      autoPay,
      nextInvoiceDate,
    })
    .returning();

  return c.json(plan);
});

// PUT /plans/:planId - Update a billing plan
app.put("/plans/:planId", async (c) => {
  const userId = c.get("userId") as string;
  const planId = c.req.param("planId");
  const body = await c.req.json();

  const [plan] = await db
    .select({
      id: billingPlans.id,
      enrollmentId: billingPlans.enrollmentId,
    })
    .from(billingPlans)
    .where(eq(billingPlans.id, planId))
    .limit(1);

  if (!plan) throw new Error("Billing plan not found");

  const [enrollment] = await db
    .select({ facilityId: enrollments.facilityId })
    .from(enrollments)
    .where(eq(enrollments.id, plan.enrollmentId))
    .limit(1);

  if (!enrollment) throw new Error("Enrollment not found");
  await assertFacilityManager(enrollment.facilityId, userId);

  const [updated] = await db
    .update(billingPlans)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(billingPlans.id, planId))
    .returning();

  return c.json(updated);
});

// GET /plans/:enrollmentId - Get billing plan for an enrollment
app.get("/plans/:enrollmentId", async (c) => {
  const userId = c.get("userId") as string;
  const enrollmentId = c.req.param("enrollmentId");
  const facilityId = c.req.query("facilityId");

  if (!facilityId) throw new Error("facilityId is required");
  await assertFacilityManager(facilityId, userId);

  const [plan] = await db
    .select()
    .from(billingPlans)
    .where(eq(billingPlans.enrollmentId, enrollmentId))
    .limit(1);

  return c.json(plan || null);
});

// GET /overview/:facilityId - Get billing overview
app.get("/overview/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityManager(facilityId, userId);

  const [totalRevenue] = await db
    .select({
      total: sql<string>`coalesce(sum(${payments.amount}), 0)`,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(
      and(
        eq(invoices.facilityId, facilityId),
        eq(payments.status, "succeeded")
      )
    );

  const [outstanding] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoices.total}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.facilityId, facilityId),
        eq(invoices.status, "sent")
      )
    );

  const [overdue] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoices.total}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.facilityId, facilityId),
        eq(invoices.status, "overdue")
      )
    );

  return c.json({
    totalRevenue: totalRevenue?.total || "0",
    outstandingAmount: outstanding?.total || "0",
    outstandingCount: outstanding?.count || 0,
    overdueAmount: overdue?.total || "0",
    overdueCount: overdue?.count || 0,
  });
});

// GET /invoices/:facilityId - Get facility invoices
app.get("/invoices/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const status = c.req.query("status");

  await assertFacilityManager(facilityId, userId);

  const conditions = [eq(invoices.facilityId, facilityId)];
  if (status && status !== "all") {
    conditions.push(eq(invoices.status, status as any));
  }

  const results = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      total: invoices.total,
      dueDate: invoices.dueDate,
      paidAt: invoices.paidAt,
      createdAt: invoices.createdAt,
      parentName: users.name,
      parentEmail: users.email,
    })
    .from(invoices)
    .innerJoin(users, eq(invoices.parentId, users.id))
    .where(and(...conditions))
    .orderBy(desc(invoices.createdAt));

  return c.json(results);
});

// POST /invoices - Create a manual invoice
app.post("/invoices", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const {
    facilityId,
    parentId,
    enrollmentId,
    dueDate,
    billingPeriodStart,
    billingPeriodEnd,
    lineItems,
    taxAmount: taxAmountStr,
    notes,
  } = body;

  await assertFacilityManager(facilityId, userId);

  const invoiceNumber = await generateInvoiceNumber(facilityId);

  // Calculate totals from line items
  const subtotal = lineItems.reduce(
    (sum: number, item: { quantity: number; unitPrice: string }) => {
      return sum + item.quantity * parseFloat(item.unitPrice);
    },
    0
  );
  const taxAmount = parseFloat(taxAmountStr || "0");
  const total = subtotal + taxAmount;

  const [invoice] = await db
    .insert(invoices)
    .values({
      facilityId,
      parentId,
      enrollmentId,
      invoiceNumber,
      dueDate,
      billingPeriodStart,
      billingPeriodEnd,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      notes,
      status: "draft",
    })
    .returning();

  // Insert line items
  await db.insert(invoiceLineItems).values(
    lineItems.map(
      (
        item: { description: string; quantity: number; unitPrice: string },
        index: number
      ) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: (item.quantity * parseFloat(item.unitPrice)).toFixed(2),
        sortOrder: index,
      })
    )
  );

  return c.json(invoice);
});

// PUT /invoices/:invoiceId - Update a draft invoice
app.put("/invoices/:invoiceId", async (c) => {
  const userId = c.get("userId") as string;
  const invoiceId = c.req.param("invoiceId");
  const body = await c.req.json();
  const { lineItems, ...updates } = body;

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "draft") throw new Error("Can only edit draft invoices");

  await assertFacilityManager(invoice.facilityId, userId);

  if (lineItems) {
    // Delete existing and re-insert
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));

    const subtotal = lineItems.reduce(
      (sum: number, item: { quantity: number; unitPrice: string }) => {
        return sum + item.quantity * parseFloat(item.unitPrice);
      },
      0
    );
    const taxAmount = parseFloat(updates.taxAmount || invoice.taxAmount || "0");
    const total = subtotal + taxAmount;

    await db.insert(invoiceLineItems).values(
      lineItems.map(
        (
          item: { description: string; quantity: number; unitPrice: string },
          index: number
        ) => ({
          invoiceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: (item.quantity * parseFloat(item.unitPrice)).toFixed(2),
          sortOrder: index,
        })
      )
    );

    const [updated] = await db
      .update(invoices)
      .set({
        ...updates,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    return c.json(updated);
  }

  const [updated] = await db
    .update(invoices)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId))
    .returning();

  return c.json(updated);
});

// POST /invoices/:invoiceId/send - Send an invoice
app.post("/invoices/:invoiceId/send", async (c) => {
  const userId = c.get("userId") as string;
  const invoiceId = c.req.param("invoiceId");

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "draft") throw new Error("Can only send draft invoices");

  await assertFacilityManager(invoice.facilityId, userId);

  const [updated] = await db
    .update(invoices)
    .set({ status: "sent", updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId))
    .returning();

  // Get facility name for notification
  const [facility] = await db
    .select({ name: facilities.name })
    .from(facilities)
    .where(eq(facilities.id, invoice.facilityId))
    .limit(1);

  await sendNotification({
    type: "invoice_sent",
    recipientId: invoice.parentId,
    data: {
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      dueDate: invoice.dueDate,
      facilityName: facility?.name,
    },
    actionUrl: `/parent/billing/invoices/${invoice.id}`,
  });

  return c.json(updated);
});

// POST /invoices/:invoiceId/void - Void an invoice
app.post("/invoices/:invoiceId/void", async (c) => {
  const userId = c.get("userId") as string;
  const invoiceId = c.req.param("invoiceId");

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "paid") throw new Error("Cannot void a paid invoice");

  await assertFacilityManager(invoice.facilityId, userId);

  const [updated] = await db
    .update(invoices)
    .set({ status: "void", updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId))
    .returning();

  return c.json(updated);
});

// GET /invoices/:invoiceId/detail - Get invoice detail
app.get("/invoices/:invoiceId/detail", async (c) => {
  const userId = c.get("userId") as string;
  const invoiceId = c.req.param("invoiceId");
  const facilityId = c.req.query("facilityId");

  if (!facilityId) throw new Error("facilityId is required");
  await assertFacilityManager(facilityId, userId);

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
      parentId: invoices.parentId,
      parentName: users.name,
      parentEmail: users.email,
      facilityName: facilities.name,
    })
    .from(invoices)
    .innerJoin(users, eq(invoices.parentId, users.id))
    .innerJoin(facilities, eq(invoices.facilityId, facilities.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice) throw new Error("Invoice not found");

  const lineItemsList = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId))
    .orderBy(invoiceLineItems.sortOrder);

  const paymentsList = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(desc(payments.createdAt));

  return c.json({ ...invoice, lineItems: lineItemsList, payments: paymentsList });
});

// GET /parents/:facilityId - Get facility parents
app.get("/parents/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityManager(facilityId, userId);

  // Get parents who have children enrolled at this facility
  const results = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .innerJoin(children, eq(children.parentId, users.id))
    .innerJoin(enrollments, eq(enrollments.childId, children.id))
    .where(
      and(
        eq(enrollments.facilityId, facilityId),
        eq(enrollments.status, "active")
      )
    )
    .groupBy(users.id, users.name, users.email);

  return c.json(results);
});

export { app as adminBillingRoutes };
