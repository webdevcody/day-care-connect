import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { facilities } from "./facilities";

export const facilityInvites = pgTable("facility_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
