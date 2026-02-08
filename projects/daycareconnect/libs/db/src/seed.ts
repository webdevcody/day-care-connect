import { config } from "dotenv";
config({ path: "../../.env" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import {
  users,
  accounts,
  facilities,
  facilityHours,
  children,
  enrollments,
  facilityStaff,
  userRoles,
} from "./schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

function genId() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function seed() {
  console.log("Seeding database...");

  // Clean existing data
  await db.execute(
    sql`TRUNCATE TABLE report_templates, daily_reports, activity_entries, quiet_hours, notification_preferences, notifications, push_subscriptions, messages, conversation_participants, conversations, attendance, enrollment_status_history, favorites, facility_services, facility_staff, enrollments, facility_photos, facility_hours, children, facilities, user_roles, account, session, verification, document_instances, document_templates, stripe_accounts, billing_plans, invoice_line_items, invoices, payment_methods, payments, "user" CASCADE`
  );

  const hashedPassword = await hashPassword("12345678");

  // --- Users ---
  const parentId = genId();
  const facilityOwnerId = genId();
  const staffId = genId();

  await db.insert(users).values([
    {
      id: parentId,
      name: "Parent User",
      email: "parent@example.com",
      firstName: "Parent",
      lastName: "User",
      role: "parent",
      emailVerified: false,
    },
    {
      id: facilityOwnerId,
      name: "Facility Owner",
      email: "facility@example.com",
      firstName: "Facility",
      lastName: "Owner",
      role: "admin",
      emailVerified: false,
    },
    {
      id: staffId,
      name: "Staff Member",
      email: "staff@example.com",
      firstName: "Staff",
      lastName: "Member",
      role: "staff",
      emailVerified: false,
    },
  ]);

  // --- Credential accounts ---
  const userList = [
    { id: parentId, email: "parent@example.com" },
    { id: facilityOwnerId, email: "facility@example.com" },
    { id: staffId, email: "staff@example.com" },
  ];
  await db.insert(accounts).values(
    userList.map((u) => ({
      id: genId(),
      accountId: u.email,
      providerId: "credential",
      userId: u.id,
      password: hashedPassword,
    }))
  );

  // --- User roles ---
  await db.insert(userRoles).values([
    { userId: parentId, role: "parent" },
    { userId: facilityOwnerId, role: "admin" },
    { userId: staffId, role: "staff" },
  ]);

  // --- Facility ---
  // Springfield, IL coordinates: ~39.7817, -89.6501
  const [facility] = await db
    .insert(facilities)
    .values({
      ownerId: facilityOwnerId,
      name: "Sunshine Kids Academy",
      description: "A bright and nurturing environment for children ages 0-5.",
      address: "123 Elm Street",
      city: "Springfield",
      state: "IL",
      zipCode: "62701",
      latitude: "39.7817",
      longitude: "-89.6501",
      phone: "555-1001",
      email: "info@sunshinekids.example.com",
      capacity: 50,
      ageRangeMin: 0,
      ageRangeMax: 5,
      monthlyRate: "1200.00",
      licenseNumber: "IL-DC-2024-001",
      licenseExpiry: "2026-12-31",
      licensingAuthority: "Illinois DCFS",
      isActive: true,
    })
    .returning();

  // --- Facility hours (Mon-Fri 7am-6pm) ---
  await db.insert(facilityHours).values(
    [1, 2, 3, 4, 5].map((day) => ({
      facilityId: facility.id,
      dayOfWeek: day,
      openTime: "07:00",
      closeTime: "18:00",
    }))
  );

  // --- Staff assignment ---
  await db.insert(facilityStaff).values({
    userId: staffId,
    facilityId: facility.id,
    staffRole: "lead_teacher" as const,
  });

  // --- Child + enrollment (links parent to facility) ---
  const [child] = await db
    .insert(children)
    .values({
      parentId,
      firstName: "Alex",
      lastName: "User",
      dateOfBirth: "2022-03-15",
      gender: "male",
      emergencyContactName: "Parent User",
      emergencyContactPhone: "555-0100",
    })
    .returning();

  await db.insert(enrollments).values({
    childId: child.id,
    facilityId: facility.id,
    status: "active" as const,
    scheduleType: "full_time" as const,
    startDate: "2024-01-15",
  });

  console.log("\nSeeding complete!");
  console.log("─".repeat(40));
  console.log("Login credentials:");
  console.log("  parent@example.com   / 12345678  (parent)");
  console.log("  facility@example.com / 12345678  (admin)");
  console.log("  staff@example.com    / 12345678  (staff)");
  console.log("─".repeat(40));

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
