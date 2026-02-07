import { pgTable, uuid, text, date, timestamp, unique } from "drizzle-orm/pg-core";
import { enrollments } from "./enrollments";
import { children } from "./children";
import { facilities } from "./facilities";
import { users } from "./users";
import { attendanceStatusEnum } from "./enums";

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id),
    date: date("date").notNull(),
    checkInTime: timestamp("check_in_time", { withTimezone: true }),
    checkOutTime: timestamp("check_out_time", { withTimezone: true }),
    status: attendanceStatusEnum("status").notNull().default("expected"),
    absenceReason: text("absence_reason"),
    checkedInBy: text("checked_in_by").references(() => users.id),
    checkedOutBy: text("checked_out_by").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique().on(table.enrollmentId, table.date)]
);
