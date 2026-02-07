import { pgTable, uuid, text, varchar, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

export const quietHours = pgTable(
  "quiet_hours",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isEnabled: boolean("is_enabled").notNull().default(false),
    startTime: varchar("start_time", { length: 5 }).notNull().default("22:00"),
    endTime: varchar("end_time", { length: 5 }).notNull().default("07:00"),
    timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("quiet_hours_user_idx").on(table.userId)]
);
