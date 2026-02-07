import { pgTable, uuid, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { facilities } from "./facilities";

export const reportTemplates = pgTable("report_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id),
  name: varchar("name", { length: 255 }).notNull(),
  entries: jsonb("entries").$type<Record<string, unknown>[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
