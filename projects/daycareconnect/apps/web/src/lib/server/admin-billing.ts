import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
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
import {
  createBillingPlanSchema,
  updateBillingPlanSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
} from "@daycare-hub/shared";
import { assertFacilityManager } from "../facility-auth";
import { sendNotification } from "./notification-service";

export const createBillingPlan = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => createBillingPlanSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    // Verify enrollment exists and user manages the facility
    const [enrollment] = await db
      .select({ id: enrollments.id, facilityId: enrollments.facilityId })
      .from(enrollments)
      .where(eq(enrollments.id, data.enrollmentId))
      .limit(1);

    if (!enrollment) throw new Error("Enrollment not found");
    await assertFacilityManager(enrollment.facilityId, session.user.id);

    const [plan] = await db
      .insert(billingPlans)
      .values({
        enrollmentId: data.enrollmentId,
        amount: data.amount,
        frequency: data.frequency,
        autoPay: data.autoPay,
        nextInvoiceDate: data.nextInvoiceDate,
      })
      .returning();

    return plan;
  });

export const updateBillingPlan = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { planId: string } & Record<string, unknown>) => ({
      planId: data.planId,
      ...updateBillingPlanSchema.parse(data),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const { planId, ...updates } = data;

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
    await assertFacilityManager(enrollment.facilityId, session.user.id);

    const [updated] = await db
      .update(billingPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(billingPlans.id, planId))
      .returning();

    return updated;
  });

export const getBillingPlanForEnrollment = createServerFn({ method: "GET" })
  .inputValidator((data: { enrollmentId: string; facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const [plan] = await db
      .select()
      .from(billingPlans)
      .where(eq(billingPlans.enrollmentId, data.enrollmentId))
      .limit(1);

    return plan || null;
  });

export const getFacilityBillingOverview = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const [totalRevenue] = await db
      .select({
        total: sql<string>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.facilityId, data.facilityId),
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
          eq(invoices.facilityId, data.facilityId),
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
          eq(invoices.facilityId, data.facilityId),
          eq(invoices.status, "overdue")
        )
      );

    return {
      totalRevenue: totalRevenue?.total || "0",
      outstandingAmount: outstanding?.total || "0",
      outstandingCount: outstanding?.count || 0,
      overdueAmount: overdue?.total || "0",
      overdueCount: overdue?.count || 0,
    };
  });

export const getFacilityInvoices = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string; status?: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const conditions = [eq(invoices.facilityId, data.facilityId)];
    if (data.status && data.status !== "all") {
      conditions.push(eq(invoices.status, data.status as any));
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
        parentName: users.name,
        parentEmail: users.email,
      })
      .from(invoices)
      .innerJoin(users, eq(invoices.parentId, users.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt));
  });

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

export const createManualInvoice = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => createInvoiceSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const invoiceNumber = await generateInvoiceNumber(data.facilityId);

    // Calculate totals from line items
    const subtotal = data.lineItems.reduce((sum, item) => {
      return sum + item.quantity * parseFloat(item.unitPrice);
    }, 0);
    const taxAmount = parseFloat(data.taxAmount || "0");
    const total = subtotal + taxAmount;

    const [invoice] = await db
      .insert(invoices)
      .values({
        facilityId: data.facilityId,
        parentId: data.parentId,
        enrollmentId: data.enrollmentId,
        invoiceNumber,
        dueDate: data.dueDate,
        billingPeriodStart: data.billingPeriodStart,
        billingPeriodEnd: data.billingPeriodEnd,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        notes: data.notes,
        status: "draft",
      })
      .returning();

    // Insert line items
    await db.insert(invoiceLineItems).values(
      data.lineItems.map((item, index) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: (item.quantity * parseFloat(item.unitPrice)).toFixed(2),
        sortOrder: index,
      }))
    );

    return invoice;
  });

export const updateDraftInvoice = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { invoiceId: string } & Record<string, unknown>) => ({
      invoiceId: data.invoiceId,
      ...updateInvoiceSchema.parse(data),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const { invoiceId, lineItems, ...updates } = data;

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status !== "draft") throw new Error("Can only edit draft invoices");

    await assertFacilityManager(invoice.facilityId, session.user.id);

    if (lineItems) {
      // Delete existing and re-insert
      await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));

      const subtotal = lineItems.reduce((sum, item) => {
        return sum + item.quantity * parseFloat(item.unitPrice);
      }, 0);
      const taxAmount = parseFloat(updates.taxAmount || invoice.taxAmount || "0");
      const total = subtotal + taxAmount;

      await db.insert(invoiceLineItems).values(
        lineItems.map((item, index) => ({
          invoiceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: (item.quantity * parseFloat(item.unitPrice)).toFixed(2),
          sortOrder: index,
        }))
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

      return updated;
    }

    const [updated] = await db
      .update(invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId))
      .returning();

    return updated;
  });

export const sendInvoice = createServerFn({ method: "POST" })
  .inputValidator((data: { invoiceId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, data.invoiceId))
      .limit(1);

    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status !== "draft") throw new Error("Can only send draft invoices");

    await assertFacilityManager(invoice.facilityId, session.user.id);

    const [updated] = await db
      .update(invoices)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(invoices.id, data.invoiceId))
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

    return updated;
  });

export const voidInvoice = createServerFn({ method: "POST" })
  .inputValidator((data: { invoiceId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, data.invoiceId))
      .limit(1);

    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "paid") throw new Error("Cannot void a paid invoice");

    await assertFacilityManager(invoice.facilityId, session.user.id);

    const [updated] = await db
      .update(invoices)
      .set({ status: "void", updatedAt: new Date() })
      .where(eq(invoices.id, data.invoiceId))
      .returning();

    return updated;
  });

export const getInvoiceDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { invoiceId: string; facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

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
      .where(eq(invoices.id, data.invoiceId))
      .limit(1);

    if (!invoice) throw new Error("Invoice not found");

    const lineItemsList = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, data.invoiceId))
      .orderBy(invoiceLineItems.sortOrder);

    const paymentsList = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, data.invoiceId))
      .orderBy(desc(payments.createdAt));

    return { ...invoice, lineItems: lineItemsList, payments: paymentsList };
  });

export const getFacilityParents = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

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
          eq(enrollments.facilityId, data.facilityId),
          eq(enrollments.status, "active")
        )
      )
      .groupBy(users.id, users.name, users.email);

    return results;
  });
