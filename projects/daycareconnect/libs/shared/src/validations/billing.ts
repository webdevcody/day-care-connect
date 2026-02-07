import { z } from "zod";
import { BILLING_FREQUENCIES, INVOICE_STATUSES } from "../constants";

export const createBillingPlanSchema = z.object({
  enrollmentId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  frequency: z.enum(BILLING_FREQUENCIES),
  autoPay: z.boolean().optional().default(false),
  nextInvoiceDate: z.string().optional(),
});

export const updateBillingPlanSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount").optional(),
  frequency: z.enum(BILLING_FREQUENCIES).optional(),
  autoPay: z.boolean().optional(),
  nextInvoiceDate: z.string().optional(),
});

const invoiceLineItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  quantity: z.number().min(1),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price"),
});

export const createInvoiceSchema = z.object({
  facilityId: z.string().uuid(),
  parentId: z.string().min(1),
  enrollmentId: z.string().uuid().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  billingPeriodStart: z.string().optional(),
  billingPeriodEnd: z.string().optional(),
  taxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0"),
  notes: z.string().max(1000).optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
});

export const updateInvoiceSchema = z.object({
  dueDate: z.string().optional(),
  taxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  notes: z.string().max(1000).optional().nullable(),
  lineItems: z.array(invoiceLineItemSchema).min(1).optional(),
});

export type CreateBillingPlanInput = z.infer<typeof createBillingPlanSchema>;
export type UpdateBillingPlanInput = z.infer<typeof updateBillingPlanSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
