import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { facilities } from "./facilities";
import { users } from "./users";
import { staffRoleEnum } from "./enums";

export const staffInvites = pgTable("staff_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  staffRole: staffRoleEnum("staff_role").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedByUserId: text("used_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
