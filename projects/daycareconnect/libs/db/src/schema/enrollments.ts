import { pgTable, uuid, text, date, timestamp } from "drizzle-orm/pg-core";
import { children } from "./children";
import { facilities } from "./facilities";
import { enrollmentStatusEnum, scheduleTypeEnum } from "./enums";

export const enrollments = pgTable("enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id),
  status: enrollmentStatusEnum("status").notNull().default("pending"),
  scheduleType: scheduleTypeEnum("schedule_type").notNull().default("full_time"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
