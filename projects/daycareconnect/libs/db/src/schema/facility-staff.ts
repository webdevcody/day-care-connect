import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { facilities } from "./facilities";
import { staffRoleEnum } from "./enums";

export const facilityStaff = pgTable("facility_staff", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id),
  staffRole: staffRoleEnum("staff_role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
