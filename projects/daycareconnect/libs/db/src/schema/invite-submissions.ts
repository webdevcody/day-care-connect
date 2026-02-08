import { pgTable, uuid, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { facilityInvites } from "./facility-invites";
import { users } from "./users";
import { children } from "./children";
import { enrollments } from "./enrollments";

export const inviteSubmissions = pgTable("invite_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  inviteId: uuid("invite_id")
    .notNull()
    .references(() => facilityInvites.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  childId: uuid("child_id").references(() => children.id),
  enrollmentId: uuid("enrollment_id").references(() => enrollments.id),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"),
  completedForms: jsonb("completed_forms").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
