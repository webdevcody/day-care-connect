import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { facilities } from "./facilities";

export const facilityServices = pgTable("facility_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id, { onDelete: "cascade" }),
  serviceName: varchar("service_name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
