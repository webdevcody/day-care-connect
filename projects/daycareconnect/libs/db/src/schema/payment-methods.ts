import { pgTable, uuid, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
  stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 255 }).notNull(),
  cardBrand: varchar("card_brand", { length: 50 }),
  cardLast4: varchar("card_last4", { length: 4 }),
  cardExpMonth: varchar("card_exp_month", { length: 2 }),
  cardExpYear: varchar("card_exp_year", { length: 4 }),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
