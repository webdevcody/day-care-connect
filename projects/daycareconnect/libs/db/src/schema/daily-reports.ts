import { pgTable, uuid, text, date, timestamp, unique } from "drizzle-orm/pg-core";
import { children } from "./children";
import { facilities } from "./facilities";
import { users } from "./users";
import { dailyReportStatusEnum } from "./enums";

export const dailyReports = pgTable(
  "daily_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id),
    date: date("date").notNull(),
    summary: text("summary"),
    status: dailyReportStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: text("published_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique().on(table.childId, table.facilityId, table.date)]
);
