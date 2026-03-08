import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  date,
  time,
  integer,
  unique,
} from "drizzle-orm/pg-core";

// ─── Better Auth tables ───

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("parent"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Application tables ───

export const facilities = pgTable("facilities", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const children = pgTable("children", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  allergies: text("allergies"),
  medicalNotes: text("medical_notes"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const childPhotos = pgTable("child_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  altText: text("alt_text"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const guardians = pgTable("guardians", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const childGuardians = pgTable(
  "child_guardians",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    guardianId: uuid("guardian_id")
      .notNull()
      .references(() => guardians.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.childId, t.guardianId)]
);

export const attendanceRecords = pgTable("attendance_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id, { onDelete: "cascade" }),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => facilities.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  signInTime: time("sign_in_time"),
  signOutTime: time("sign_out_time"),
  signedInBy: text("signed_in_by").references(() => users.id),
  signedOutBy: text("signed_out_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
