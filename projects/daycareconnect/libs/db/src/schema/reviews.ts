import { pgTable, uuid, text, integer, varchar, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";
import { facilities } from "./facilities";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    parentId: text("parent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    overallRating: integer("overall_rating").notNull(),
    safetyRating: integer("safety_rating"),
    staffRating: integer("staff_rating"),
    activitiesRating: integer("activities_rating"),
    valueRating: integer("value_rating"),
    title: varchar("title", { length: 100 }),
    body: text("body"),
    wouldRecommend: boolean("would_recommend"),
    isReported: boolean("is_reported").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("reviews_facility_parent_idx").on(table.facilityId, table.parentId)]
);
