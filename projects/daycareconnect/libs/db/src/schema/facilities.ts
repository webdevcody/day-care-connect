import { pgTable, uuid, varchar, text, integer, numeric, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { users } from "./users";

export const facilities = pgTable("facilities", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  address: varchar("address", { length: 500 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 500 }),
  capacity: integer("capacity").notNull(),
  ageRangeMin: integer("age_range_min").notNull().default(0),
  ageRangeMax: integer("age_range_max").notNull().default(12),
  monthlyRate: numeric("monthly_rate", { precision: 10, scale: 2 }),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  dailyRate: numeric("daily_rate", { precision: 10, scale: 2 }),
  weeklyRate: numeric("weekly_rate", { precision: 10, scale: 2 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  licenseExpiry: date("license_expiry"),
  licensingAuthority: varchar("licensing_authority", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  ratingAverage: numeric("rating_average", { precision: 2, scale: 1 }),
  reviewCount: integer("review_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
