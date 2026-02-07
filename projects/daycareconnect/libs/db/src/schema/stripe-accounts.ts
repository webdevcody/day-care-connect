import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { facilities } from "./facilities";

export const stripeAccounts = pgTable("stripe_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id")
    .notNull()
    .unique()
    .references(() => facilities.id),
  stripeAccountId: varchar("stripe_account_id", { length: 255 }).notNull(),
  isOnboarded: boolean("is_onboarded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
