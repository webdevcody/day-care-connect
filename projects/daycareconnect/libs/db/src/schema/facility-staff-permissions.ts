import { pgTable, uuid, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { facilityStaff } from "./facility-staff";

export const facilityStaffPermissions = pgTable(
  "facility_staff_permissions",
  {
    facilityStaffId: uuid("facility_staff_id")
      .notNull()
      .references(() => facilityStaff.id, { onDelete: "cascade" }),
    permission: text("permission").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.facilityStaffId, table.permission] }),
  })
);
