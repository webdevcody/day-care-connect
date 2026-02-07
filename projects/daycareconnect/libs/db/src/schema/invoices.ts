import { pgTable, uuid, text, varchar, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { facilities } from "./facilities";
import { users } from "./users";
import { enrollments } from "./enrollments";
import { invoiceStatusEnum } from "./enums";

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id),
  parentId: text("parent_id")
    .notNull()
    .references(() => users.id),
  enrollmentId: uuid("enrollment_id").references(() => enrollments.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  dueDate: date("due_date").notNull(),
  billingPeriodStart: date("billing_period_start"),
  billingPeriodEnd: date("billing_period_end"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
