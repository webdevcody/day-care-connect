import { pgTable, uuid, numeric, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { enrollments } from "./enrollments";
import { billingFrequencyEnum } from "./enums";

export const billingPlans = pgTable("billing_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  enrollmentId: uuid("enrollment_id")
    .notNull()
    .unique()
    .references(() => enrollments.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  frequency: billingFrequencyEnum("frequency").notNull().default("monthly"),
  autoPay: boolean("auto_pay").notNull().default(false),
  nextInvoiceDate: date("next_invoice_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
