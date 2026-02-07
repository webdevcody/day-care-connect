import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { children } from "./children";
import { facilities } from "./facilities";
import { users } from "./users";
import { activityTypeEnum } from "./enums";

export const activityEntries = pgTable(
  "activity_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id),
    staffId: text("staff_id")
      .notNull()
      .references(() => users.id),
    type: activityTypeEnum("type").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().default({}),
    photoUrl: text("photo_url"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("activity_entries_child_occurred_idx").on(table.childId, table.occurredAt),
    index("activity_entries_facility_occurred_idx").on(table.facilityId, table.occurredAt),
  ]
);
