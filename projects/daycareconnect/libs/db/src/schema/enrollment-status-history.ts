import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { enrollments } from "./enrollments";
import { users } from "./users";
import { enrollmentStatusEnum } from "./enums";

export const enrollmentStatusHistory = pgTable("enrollment_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  enrollmentId: uuid("enrollment_id")
    .notNull()
    .references(() => enrollments.id, { onDelete: "cascade" }),
  status: enrollmentStatusEnum("status").notNull(),
  changedBy: text("changed_by")
    .notNull()
    .references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
