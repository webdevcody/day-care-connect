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
  facilityPhotos,
  facilityServices,
  children,
  enrollments,
  enrollmentStatusHistory,
  facilityStaff,
  favorites,
  attendance,
  conversations,
  conversationParticipants,
  messages,
  notifications,
  notificationPreferences,
  quietHours,
  activityEntries,
  dailyReports,
  reportTemplates,
  reviews,
  reviewResponses,
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
    sql`TRUNCATE TABLE review_responses, reviews, report_templates, daily_reports, activity_entries, quiet_hours, notification_preferences, notifications, push_subscriptions, messages, conversation_participants, conversations, attendance, enrollment_status_history, favorites, facility_services, facility_staff, enrollments, facility_photos, facility_hours, children, facilities, user_roles, account, session, verification, "user" CASCADE`
  );

  const hashedPassword = await hashPassword("password123");

  // Create parents
  const parentIds = Array.from({ length: 5 }, () => genId());
  const parentData = [
    { id: parentIds[0], name: "Sarah Johnson", email: "sarah@example.com", firstName: "Sarah", lastName: "Johnson", role: "parent", phone: "555-0101", emailVerified: false },
    { id: parentIds[1], name: "Mike Chen", email: "mike@example.com", firstName: "Mike", lastName: "Chen", role: "parent", phone: "555-0102", emailVerified: false },
    { id: parentIds[2], name: "Lisa Williams", email: "lisa@example.com", firstName: "Lisa", lastName: "Williams", role: "parent", phone: "555-0103", emailVerified: false },
    { id: parentIds[3], name: "David Brown", email: "david@example.com", firstName: "David", lastName: "Brown", role: "parent", phone: "555-0104", emailVerified: false },
    { id: parentIds[4], name: "Emma Davis", email: "emma@example.com", firstName: "Emma", lastName: "Davis", role: "parent", phone: "555-0105", emailVerified: false },
  ];
  await db.insert(users).values(parentData);

  // Create admins
  const adminIds = Array.from({ length: 3 }, () => genId());
  const adminData = [
    { id: adminIds[0], name: "Alice Manager", email: "admin1@example.com", firstName: "Alice", lastName: "Manager", role: "admin", phone: "555-0201", emailVerified: false },
    { id: adminIds[1], name: "Bob Director", email: "admin2@example.com", firstName: "Bob", lastName: "Director", role: "admin", phone: "555-0202", emailVerified: false },
    { id: adminIds[2], name: "Carol Supervisor", email: "admin3@example.com", firstName: "Carol", lastName: "Supervisor", role: "admin", phone: "555-0203", emailVerified: false },
  ];
  await db.insert(users).values(adminData);

  // Create staff
  const staffIds = Array.from({ length: 2 }, () => genId());
  const staffData = [
    { id: staffIds[0], name: "Nancy Smith", email: "teacher1@example.com", firstName: "Nancy", lastName: "Smith", role: "staff", phone: "555-0301", emailVerified: false },
    { id: staffIds[1], name: "Tom Wilson", email: "teacher2@example.com", firstName: "Tom", lastName: "Wilson", role: "staff", phone: "555-0302", emailVerified: false },
  ];
  await db.insert(users).values(staffData);

  // Create credential accounts for all users
  const allUserIds = [...parentIds, ...adminIds, ...staffIds];
  const allEmails = [
    ...parentData.map((u) => u.email),
    ...adminData.map((u) => u.email),
    ...staffData.map((u) => u.email),
  ];
  const accountData = allUserIds.map((userId, i) => ({
    id: genId(),
    accountId: allEmails[i],
    providerId: "credential",
    userId,
    password: hashedPassword,
  }));
  await db.insert(accounts).values(accountData);

  // Create user_roles for all users (each gets their primary role)
  const userRolesData = [
    ...parentIds.map((id) => ({ userId: id, role: "parent" })),
    ...adminIds.map((id) => ({ userId: id, role: "admin" })),
    ...staffIds.map((id) => ({ userId: id, role: "staff" })),
    // Multi-role test users
    { userId: parentIds[0], role: "admin" },   // sarah@example.com → parent + admin
    { userId: adminIds[0], role: "parent" },   // admin1@example.com → admin + parent
    { userId: staffIds[0], role: "parent" },   // teacher1@example.com → staff + parent
  ];
  await db.insert(userRoles).values(userRolesData).onConflictDoNothing();

  // Create facilities
  const facilityData = [
    {
      ownerId: adminIds[0],
      name: "Sunshine Kids Academy",
      description: "A bright and nurturing environment for children ages 0-5. Our facility features state-of-the-art classrooms, outdoor play areas, and a dedicated team of early childhood educators.",
      address: "123 Elm Street",
      city: "Springfield",
      state: "IL",
      zipCode: "62701",
      latitude: "39.7990175",
      longitude: "-89.6439575",
      phone: "555-1001",
      email: "info@sunshinekids.example.com",
      website: "https://sunshinekids.example.com",
      capacity: 50,
      ageRangeMin: 0,
      ageRangeMax: 5,
      monthlyRate: "1200.00",
      dailyRate: "75.00",
      weeklyRate: "325.00",
      licenseNumber: "IL-DC-2024-001",
      licenseExpiry: "2026-12-31",
      licensingAuthority: "Illinois DCFS",
      isActive: true,
    },
    {
      ownerId: adminIds[1],
      name: "Little Explorers Daycare",
      description: "Encouraging curiosity and learning through play. We provide a hands-on learning environment that inspires creativity and discovery.",
      address: "456 Oak Avenue",
      city: "Springfield",
      state: "IL",
      zipCode: "62702",
      latitude: "39.8105360",
      longitude: "-89.6537840",
      phone: "555-1002",
      email: "hello@littleexplorers.example.com",
      capacity: 35,
      ageRangeMin: 1,
      ageRangeMax: 8,
      monthlyRate: "1100.00",
      dailyRate: "65.00",
      licenseNumber: "IL-DC-2024-002",
      licenseExpiry: "2026-06-30",
      licensingAuthority: "Illinois DCFS",
      isActive: true,
    },
    {
      ownerId: adminIds[2],
      name: "Happy Hearts Childcare",
      description: "Where every child feels at home. Our warm and welcoming center provides personalized care for children of all ages.",
      address: "789 Maple Drive",
      city: "Springfield",
      state: "IL",
      zipCode: "62703",
      latitude: "39.7817213",
      longitude: "-89.6501481",
      phone: "555-1003",
      email: "contact@happyhearts.example.com",
      capacity: 40,
      ageRangeMin: 0,
      ageRangeMax: 12,
      monthlyRate: "1350.00",
      hourlyRate: "18.00",
      dailyRate: "80.00",
      weeklyRate: "350.00",
      licenseNumber: "IL-DC-2024-003",
      licenseExpiry: "2025-09-15",
      licensingAuthority: "Illinois DCFS",
      isActive: true,
    },
  ];
  const insertedFacilities = await db.insert(facilities).values(facilityData).returning();

  // Create facility hours (Mon-Fri 7am-6pm for all facilities)
  const hoursData = insertedFacilities.flatMap((facility) =>
    [1, 2, 3, 4, 5].map((day) => ({
      facilityId: facility.id,
      dayOfWeek: day,
      openTime: "07:00",
      closeTime: "18:00",
    }))
  );
  await db.insert(facilityHours).values(hoursData);

  // Create facility photos
  const photoData = [
    { facilityId: insertedFacilities[0].id, url: "https://placehold.co/800x600/FFD700/333?text=Sunshine+Kids+Playground", altText: "Outdoor playground area", sortOrder: 0 },
    { facilityId: insertedFacilities[0].id, url: "https://placehold.co/800x600/87CEEB/333?text=Sunshine+Kids+Classroom", altText: "Main classroom", sortOrder: 1 },
    { facilityId: insertedFacilities[1].id, url: "https://placehold.co/800x600/98FB98/333?text=Little+Explorers+Garden", altText: "Learning garden", sortOrder: 0 },
    { facilityId: insertedFacilities[1].id, url: "https://placehold.co/800x600/DDA0DD/333?text=Little+Explorers+Art+Room", altText: "Art room", sortOrder: 1 },
    { facilityId: insertedFacilities[2].id, url: "https://placehold.co/800x600/FFB6C1/333?text=Happy+Hearts+Playroom", altText: "Indoor playroom", sortOrder: 0 },
  ];
  await db.insert(facilityPhotos).values(photoData);

  // Create facility services
  const servicesData = [
    { facilityId: insertedFacilities[0].id, serviceName: "Meals Included" },
    { facilityId: insertedFacilities[0].id, serviceName: "Outdoor Play" },
    { facilityId: insertedFacilities[0].id, serviceName: "STEM Programs" },
    { facilityId: insertedFacilities[0].id, serviceName: "Music" },
    { facilityId: insertedFacilities[1].id, serviceName: "Meals Included" },
    { facilityId: insertedFacilities[1].id, serviceName: "Arts & Crafts" },
    { facilityId: insertedFacilities[1].id, serviceName: "Bilingual" },
    { facilityId: insertedFacilities[2].id, serviceName: "Meals Included" },
    { facilityId: insertedFacilities[2].id, serviceName: "Before/After School Care" },
    { facilityId: insertedFacilities[2].id, serviceName: "Special Needs Support" },
    { facilityId: insertedFacilities[2].id, serviceName: "Transportation" },
  ];
  await db.insert(facilityServices).values(servicesData);

  // Create children
  const childrenData = [
    { parentId: parentIds[0], firstName: "Olivia", lastName: "Johnson", dateOfBirth: "2021-03-15", gender: "female", emergencyContactName: "James Johnson", emergencyContactPhone: "555-0111" },
    { parentId: parentIds[0], firstName: "Ethan", lastName: "Johnson", dateOfBirth: "2022-07-22", gender: "male", emergencyContactName: "James Johnson", emergencyContactPhone: "555-0111" },
    { parentId: parentIds[1], firstName: "Mia", lastName: "Chen", dateOfBirth: "2020-11-08", gender: "female", allergies: "Peanuts", emergencyContactName: "Wei Chen", emergencyContactPhone: "555-0112" },
    { parentId: parentIds[1], firstName: "Lucas", lastName: "Chen", dateOfBirth: "2023-01-10", gender: "male", emergencyContactName: "Wei Chen", emergencyContactPhone: "555-0112" },
    { parentId: parentIds[2], firstName: "Ava", lastName: "Williams", dateOfBirth: "2021-06-30", gender: "female", emergencyContactName: "Robert Williams", emergencyContactPhone: "555-0113" },
    { parentId: parentIds[2], firstName: "Noah", lastName: "Williams", dateOfBirth: "2022-09-14", gender: "male", medicalNotes: "Asthma inhaler needed", emergencyContactName: "Robert Williams", emergencyContactPhone: "555-0113" },
    { parentId: parentIds[3], firstName: "Sophia", lastName: "Brown", dateOfBirth: "2020-04-25", gender: "female", emergencyContactName: "Karen Brown", emergencyContactPhone: "555-0114" },
    { parentId: parentIds[3], firstName: "Liam", lastName: "Brown", dateOfBirth: "2023-05-18", gender: "male", emergencyContactName: "Karen Brown", emergencyContactPhone: "555-0114" },
    { parentId: parentIds[4], firstName: "Isabella", lastName: "Davis", dateOfBirth: "2021-12-01", gender: "female", emergencyContactName: "Robert Davis", emergencyContactPhone: "555-0115" },
    { parentId: parentIds[4], firstName: "James", lastName: "Davis", dateOfBirth: "2022-02-28", gender: "male", allergies: "Dairy", emergencyContactName: "Robert Davis", emergencyContactPhone: "555-0115" },
  ];
  const insertedChildren = await db.insert(children).values(childrenData).returning();

  // Create enrollments
  const enrollmentData = [
    { childId: insertedChildren[0].id, facilityId: insertedFacilities[0].id, status: "active" as const, scheduleType: "full_time" as const, startDate: "2024-01-15", notes: "Preferred morning drop-off" },
    { childId: insertedChildren[1].id, facilityId: insertedFacilities[0].id, status: "active" as const, scheduleType: "part_time" as const, startDate: "2024-03-01" },
    { childId: insertedChildren[2].id, facilityId: insertedFacilities[1].id, status: "active" as const, scheduleType: "full_time" as const, startDate: "2023-09-01" },
    { childId: insertedChildren[3].id, facilityId: insertedFacilities[1].id, status: "pending" as const, scheduleType: "full_time" as const, notes: "Looking to start next month" },
    { childId: insertedChildren[4].id, facilityId: insertedFacilities[2].id, status: "active" as const, scheduleType: "full_time" as const, startDate: "2024-02-01" },
    { childId: insertedChildren[5].id, facilityId: insertedFacilities[2].id, status: "pending" as const, scheduleType: "part_time" as const },
    { childId: insertedChildren[6].id, facilityId: insertedFacilities[0].id, status: "active" as const, scheduleType: "drop_in" as const, startDate: "2024-01-01" },
    { childId: insertedChildren[8].id, facilityId: insertedFacilities[1].id, status: "withdrawn" as const, scheduleType: "full_time" as const, startDate: "2023-06-01", endDate: "2024-01-01" },
  ];
  const insertedEnrollments = await db.insert(enrollments).values(enrollmentData).returning();

  // Create enrollment status history
  const historyData = [
    { enrollmentId: insertedEnrollments[0].id, status: "pending" as const, changedBy: parentIds[0], reason: "Application submitted" },
    { enrollmentId: insertedEnrollments[0].id, status: "approved" as const, changedBy: adminIds[0], reason: "Application approved" },
    { enrollmentId: insertedEnrollments[0].id, status: "active" as const, changedBy: adminIds[0], reason: "Enrollment started" },
    { enrollmentId: insertedEnrollments[2].id, status: "pending" as const, changedBy: parentIds[1], reason: "Application submitted" },
    { enrollmentId: insertedEnrollments[2].id, status: "active" as const, changedBy: adminIds[1], reason: "Fast-tracked enrollment" },
    { enrollmentId: insertedEnrollments[3].id, status: "pending" as const, changedBy: parentIds[1], reason: "Application submitted" },
    { enrollmentId: insertedEnrollments[7].id, status: "pending" as const, changedBy: parentIds[4], reason: "Application submitted" },
    { enrollmentId: insertedEnrollments[7].id, status: "active" as const, changedBy: adminIds[1], reason: "Enrollment started" },
    { enrollmentId: insertedEnrollments[7].id, status: "withdrawn" as const, changedBy: parentIds[4], reason: "Relocating to another city" },
  ];
  await db.insert(enrollmentStatusHistory).values(historyData);

  // Create facility staff
  const facilityStaffData = [
    { userId: staffIds[0], facilityId: insertedFacilities[0].id, staffRole: "lead_teacher" as const },
    { userId: staffIds[1], facilityId: insertedFacilities[1].id, staffRole: "lead_teacher" as const },
    { userId: staffIds[0], facilityId: insertedFacilities[2].id, staffRole: "assistant_teacher" as const },
  ];
  await db.insert(facilityStaff).values(facilityStaffData);

  // Create favorites
  const favoritesData = [
    { userId: parentIds[0], facilityId: insertedFacilities[0].id },
    { userId: parentIds[0], facilityId: insertedFacilities[2].id },
    { userId: parentIds[1], facilityId: insertedFacilities[1].id },
    { userId: parentIds[2], facilityId: insertedFacilities[0].id },
  ];
  await db.insert(favorites).values(favoritesData);

  // Create attendance records for last 14 weekdays for active enrollments
  const activeEnrollmentsList = insertedEnrollments.filter(
    (_, i) => enrollmentData[i].status === "active"
  );
  const statuses = ["present", "absent", "expected", "late"] as const;
  const absenceReasons = ["sick", "family", "vacation", "other"] as const;
  const attendanceRecords: Array<{
    enrollmentId: string;
    childId: string;
    facilityId: string;
    date: string;
    status: "present" | "absent" | "expected" | "late";
    checkInTime?: Date;
    checkOutTime?: Date;
    checkedInBy?: string;
    checkedOutBy?: string;
    absenceReason?: string;
  }> = [];

  let weekdayCount = 0;
  const dateIterator = new Date();
  while (weekdayCount < 14) {
    dateIterator.setDate(dateIterator.getDate() - 1);
    const dow = dateIterator.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    weekdayCount++;

    const dateStr = dateIterator.toISOString().split("T")[0];

    for (const enrollment of activeEnrollmentsList) {
      const enrollIdx = insertedEnrollments.indexOf(enrollment);
      const childId = enrollmentData[enrollIdx].childId;
      const facilityId = enrollmentData[enrollIdx].facilityId;

      // Weight towards present (70%), absent (15%), late (10%), expected (5% - only for today-ish)
      const rand = Math.random();
      let status: "present" | "absent" | "expected" | "late";
      if (rand < 0.70) status = "present";
      else if (rand < 0.85) status = "absent";
      else if (rand < 0.95) status = "late";
      else status = "expected";

      const record: (typeof attendanceRecords)[number] = {
        enrollmentId: enrollment.id,
        childId,
        facilityId,
        date: dateStr,
        status,
      };

      if (status === "present" || status === "late") {
        const checkIn = new Date(dateStr + "T07:00:00");
        checkIn.setMinutes(checkIn.getMinutes() + Math.floor(Math.random() * (status === "late" ? 120 : 60)));
        record.checkInTime = checkIn;
        record.checkOutTime = new Date(dateStr + "T17:00:00");
        // Use the facility owner as checked-in-by
        const facilityIndex = insertedFacilities.findIndex((f) => f.id === facilityId);
        record.checkedInBy = adminIds[facilityIndex] || adminIds[0];
        record.checkedOutBy = adminIds[facilityIndex] || adminIds[0];
      }

      if (status === "absent") {
        record.absenceReason = absenceReasons[Math.floor(Math.random() * absenceReasons.length)];
      }

      attendanceRecords.push(record);
    }
  }

  if (attendanceRecords.length > 0) {
    await db.insert(attendance).values(attendanceRecords);
  }

  // Create conversations (parents ↔ facilities with active enrollments)
  const conversationData = [
    { parentId: parentIds[0], facilityId: insertedFacilities[0].id }, // Sarah ↔ Sunshine Kids
    { parentId: parentIds[1], facilityId: insertedFacilities[1].id }, // Mike ↔ Little Explorers
    { parentId: parentIds[2], facilityId: insertedFacilities[2].id }, // Lisa ↔ Happy Hearts
    { parentId: parentIds[3], facilityId: insertedFacilities[0].id }, // David ↔ Sunshine Kids
  ];
  const insertedConversations = await db
    .insert(conversations)
    .values(
      conversationData.map((c) => ({
        parentId: c.parentId,
        facilityId: c.facilityId,
        lastMessageAt: new Date(),
      }))
    )
    .returning();

  // Create conversation participants
  const participantsData = [
    // Conv 0: Sarah ↔ Sunshine Kids (owner: admin0, staff: staffIds[0])
    { conversationId: insertedConversations[0].id, userId: parentIds[0] },
    { conversationId: insertedConversations[0].id, userId: adminIds[0] },
    { conversationId: insertedConversations[0].id, userId: staffIds[0] },
    // Conv 1: Mike ↔ Little Explorers (owner: admin1, staff: staffIds[1])
    { conversationId: insertedConversations[1].id, userId: parentIds[1] },
    { conversationId: insertedConversations[1].id, userId: adminIds[1] },
    { conversationId: insertedConversations[1].id, userId: staffIds[1] },
    // Conv 2: Lisa ↔ Happy Hearts (owner: admin2, staff: staffIds[0])
    { conversationId: insertedConversations[2].id, userId: parentIds[2] },
    { conversationId: insertedConversations[2].id, userId: adminIds[2] },
    { conversationId: insertedConversations[2].id, userId: staffIds[0] },
    // Conv 3: David ↔ Sunshine Kids (owner: admin0, staff: staffIds[0])
    { conversationId: insertedConversations[3].id, userId: parentIds[3] },
    { conversationId: insertedConversations[3].id, userId: adminIds[0] },
    { conversationId: insertedConversations[3].id, userId: staffIds[0] },
  ];
  await db.insert(conversationParticipants).values(participantsData);

  // Create sample messages
  const now = Date.now();
  const messageData = [
    { conversationId: insertedConversations[0].id, senderId: parentIds[0], content: "Hi, I wanted to let you know that Olivia will be picked up early today around 3pm.", createdAt: new Date(now - 3600000 * 5) },
    { conversationId: insertedConversations[0].id, senderId: adminIds[0], content: "Thanks for letting us know, Sarah! We'll have her ready. Is everything okay?", createdAt: new Date(now - 3600000 * 4) },
    { conversationId: insertedConversations[0].id, senderId: parentIds[0], content: "Yes, just a dentist appointment. Thanks!", createdAt: new Date(now - 3600000 * 3) },
    { conversationId: insertedConversations[1].id, senderId: parentIds[1], content: "Does Mia need to bring anything special for the field trip next week?", createdAt: new Date(now - 3600000 * 8) },
    { conversationId: insertedConversations[1].id, senderId: staffIds[1], content: "Just a packed lunch and sunscreen! We'll provide water bottles and snacks.", createdAt: new Date(now - 3600000 * 7) },
    { conversationId: insertedConversations[2].id, senderId: parentIds[2], content: "Noah has been coughing a bit this morning. He has his inhaler in his bag.", createdAt: new Date(now - 3600000 * 2) },
    { conversationId: insertedConversations[2].id, senderId: adminIds[2], content: "Thank you for the heads up, Lisa. We'll keep an eye on him and make sure his inhaler is accessible.", createdAt: new Date(now - 3600000) },
  ];
  await db.insert(messages).values(messageData);

  // Update lastMessageAt on conversations
  for (let i = 0; i < insertedConversations.length; i++) {
    const convMessages = messageData.filter(
      (m) => m.conversationId === insertedConversations[i].id
    );
    if (convMessages.length > 0) {
      const lastMsg = convMessages[convMessages.length - 1];
      await db
        .update(conversations)
        .set({ lastMessageAt: lastMsg.createdAt })
        .where(sql`${conversations.id} = ${insertedConversations[i].id}`);
    }
  }

  // Create sample notifications
  const notificationData = [
    // Parent notifications
    { userId: parentIds[0], type: "enrollment_approved", title: "Enrollment approved", body: "Your enrollment for Olivia Johnson at Sunshine Kids Academy has been approved", actionUrl: "/parent/children", isRead: true, createdAt: new Date(now - 3600000 * 48) },
    { userId: parentIds[0], type: "check_in", title: "Child checked in", body: "Olivia Johnson has been checked in at Sunshine Kids Academy", actionUrl: "/parent", isRead: true, createdAt: new Date(now - 3600000 * 24) },
    { userId: parentIds[0], type: "check_out", title: "Child checked out", body: "Olivia Johnson has been checked out from Sunshine Kids Academy", actionUrl: "/parent", isRead: false, createdAt: new Date(now - 3600000 * 14) },
    { userId: parentIds[0], type: "new_message", title: "New message from Alice Manager", body: "Thanks for letting us know, Sarah! We'll have her ready.", actionUrl: `/parent/messages/${insertedConversations[0].id}`, isRead: false, createdAt: new Date(now - 3600000 * 4) },
    { userId: parentIds[1], type: "new_message", title: "New message from Tom Wilson", body: "Just a packed lunch and sunscreen! We'll provide water bottles and snacks.", actionUrl: `/parent/messages/${insertedConversations[1].id}`, isRead: false, createdAt: new Date(now - 3600000 * 7) },
    { userId: parentIds[1], type: "check_in", title: "Child checked in", body: "Mia Chen has been checked in at Little Explorers Daycare", actionUrl: "/parent", isRead: false, createdAt: new Date(now - 3600000 * 3) },
    // Admin notifications
    { userId: adminIds[0], type: "enrollment_submitted", title: "New enrollment application", body: "David Brown submitted an enrollment for Sophia Brown at Sunshine Kids Academy", actionUrl: `/facility/${insertedFacilities[0].id}/enrollments`, isRead: false, createdAt: new Date(now - 3600000 * 10) },
    { userId: adminIds[0], type: "new_message", title: "New message from Sarah Johnson", body: "Hi, I wanted to let you know that Olivia will be picked up early today around 3pm.", actionUrl: `/facility/messages/${insertedConversations[0].id}`, isRead: true, createdAt: new Date(now - 3600000 * 5) },
    { userId: adminIds[1], type: "enrollment_submitted", title: "New enrollment application", body: "Mike Chen submitted an enrollment for Lucas Chen at Little Explorers Daycare", actionUrl: `/facility/${insertedFacilities[1].id}/enrollments`, isRead: false, createdAt: new Date(now - 3600000 * 20) },
    { userId: adminIds[2], type: "enrollment_withdrawn", title: "Enrollment withdrawn", body: "Lisa Williams withdrew Noah Williams from Happy Hearts Childcare", actionUrl: `/facility/${insertedFacilities[2].id}/enrollments`, isRead: false, createdAt: new Date(now - 3600000 * 6) },
  ];
  await db.insert(notifications).values(notificationData);

  // Create sample notification preferences for Sarah (parent)
  const prefData = [
    { userId: parentIds[0], notificationType: "new_message", inAppEnabled: true, pushEnabled: true },
    { userId: parentIds[0], notificationType: "check_in", inAppEnabled: true, pushEnabled: false },
    { userId: parentIds[0], notificationType: "check_out", inAppEnabled: true, pushEnabled: false },
  ];
  await db.insert(notificationPreferences).values(prefData);

  // Create activity entries for enrolled children (last 3 days)
  const activityTypes = ["meal", "nap", "activity", "mood", "bathroom", "note", "photo"] as const;
  const activityRecords: Array<{
    childId: string;
    facilityId: string;
    staffId: string;
    type: string;
    data: Record<string, unknown>;
    photoUrl?: string;
    occurredAt: Date;
  }> = [];

  // Only use active enrollments for activity entries
  const activeEnrollmentsForActivities = insertedEnrollments.filter(
    (_, i) => enrollmentData[i].status === "active"
  );

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const day = new Date();
    day.setDate(day.getDate() - dayOffset);
    const dateStr = day.toISOString().split("T")[0];

    for (const enrollment of activeEnrollmentsForActivities) {
      const enrollIdx = insertedEnrollments.indexOf(enrollment);
      const childId = enrollmentData[enrollIdx].childId;
      const facilityId = enrollmentData[enrollIdx].facilityId;
      const facilityIndex = insertedFacilities.findIndex((f) => f.id === facilityId);
      const staffId = facilityIndex === 0 ? staffIds[0] : facilityIndex === 1 ? staffIds[1] : staffIds[0];

      // Morning meal
      activityRecords.push({
        childId,
        facilityId,
        staffId,
        type: "meal",
        data: { mealType: "breakfast", amountEaten: "most", description: "Oatmeal with fruit" },
        occurredAt: new Date(`${dateStr}T08:30:00`),
      });

      // Nap
      activityRecords.push({
        childId,
        facilityId,
        staffId,
        type: "nap",
        data: { startTime: "12:30", endTime: "14:00", quality: "good" },
        occurredAt: new Date(`${dateStr}T12:30:00`),
      });

      // Activity
      const categories = ["outdoor_play", "art", "reading", "free_play", "music"];
      activityRecords.push({
        childId,
        facilityId,
        staffId,
        type: "activity",
        data: {
          category: categories[Math.floor(Math.random() * categories.length)],
          description: "Had a great time participating in group activities",
        },
        occurredAt: new Date(`${dateStr}T10:00:00`),
      });

      // Lunch
      activityRecords.push({
        childId,
        facilityId,
        staffId,
        type: "meal",
        data: { mealType: "lunch", amountEaten: "all", description: "Chicken nuggets, veggies, and milk" },
        occurredAt: new Date(`${dateStr}T11:45:00`),
      });

      // Bathroom
      activityRecords.push({
        childId,
        facilityId,
        staffId,
        type: "bathroom",
        data: { bathroomType: "diaper_wet" },
        occurredAt: new Date(`${dateStr}T09:15:00`),
      });

      // Mood check
      const moods = ["happy", "calm", "excited"];
      activityRecords.push({
        childId,
        facilityId,
        staffId,
        type: "mood",
        data: { mood: moods[Math.floor(Math.random() * moods.length)] },
        occurredAt: new Date(`${dateStr}T15:00:00`),
      });

      // Afternoon snack
      activityRecords.push({
        childId,
        facilityId,
        staffId,
        type: "meal",
        data: { mealType: "afternoon_snack", amountEaten: "some", description: "Crackers and juice" },
        occurredAt: new Date(`${dateStr}T15:30:00`),
      });
    }
  }

  if (activityRecords.length > 0) {
    await db.insert(activityEntries).values(activityRecords);
  }

  // Create daily reports (published for past days, draft for today)
  const dailyReportRecords: Array<{
    childId: string;
    facilityId: string;
    date: string;
    summary?: string;
    status: "draft" | "published";
    publishedAt?: Date;
    publishedBy?: string;
  }> = [];

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const day = new Date();
    day.setDate(day.getDate() - dayOffset);
    const dateStr = day.toISOString().split("T")[0];
    const isToday = dayOffset === 0;

    for (const enrollment of activeEnrollmentsForActivities) {
      const enrollIdx = insertedEnrollments.indexOf(enrollment);
      const childId = enrollmentData[enrollIdx].childId;
      const facilityId = enrollmentData[enrollIdx].facilityId;
      const facilityIndex = insertedFacilities.findIndex((f) => f.id === facilityId);

      dailyReportRecords.push({
        childId,
        facilityId,
        date: dateStr,
        summary: isToday
          ? undefined
          : "Had a wonderful day! Great appetite at meals, slept well during nap time, and was very engaged during activities.",
        status: isToday ? "draft" : "published",
        publishedAt: isToday ? undefined : new Date(`${dateStr}T17:00:00`),
        publishedBy: isToday ? undefined : adminIds[facilityIndex] || adminIds[0],
      });
    }
  }

  if (dailyReportRecords.length > 0) {
    await db.insert(dailyReports).values(dailyReportRecords);
  }

  // Create a report template
  const templateData = [
    {
      facilityId: insertedFacilities[0].id,
      name: "Standard Daily Report",
      entries: [
        { type: "meal", label: "Breakfast" },
        { type: "activity", label: "Morning Activity" },
        { type: "meal", label: "Lunch" },
        { type: "nap", label: "Nap Time" },
        { type: "meal", label: "Afternoon Snack" },
        { type: "activity", label: "Afternoon Activity" },
        { type: "mood", label: "End of Day Mood" },
      ],
    },
  ];
  await db.insert(reportTemplates).values(templateData);

  // Create reviews (parents with enrollments reviewing facilities)
  const reviewData = [
    // Sarah (parentIds[0]) reviews Sunshine Kids (facility 0) - has active enrollment
    {
      facilityId: insertedFacilities[0].id,
      parentId: parentIds[0],
      overallRating: 5,
      safetyRating: 5,
      staffRating: 5,
      activitiesRating: 4,
      valueRating: 4,
      title: "Wonderful place for our kids",
      body: "We've had both our children here for over a year now and couldn't be happier. The staff is incredibly caring and attentive. Olivia has thrived in their programs.",
      wouldRecommend: true,
    },
    // Mike (parentIds[1]) reviews Little Explorers (facility 1) - has active enrollment
    {
      facilityId: insertedFacilities[1].id,
      parentId: parentIds[1],
      overallRating: 4,
      safetyRating: 5,
      staffRating: 4,
      activitiesRating: 4,
      valueRating: 3,
      title: "Great learning environment",
      body: "Mia loves going here every day. The bilingual program is a fantastic bonus. Only wish the monthly rate was a bit lower.",
      wouldRecommend: true,
    },
    // Lisa (parentIds[2]) reviews Happy Hearts (facility 2) - has active enrollment
    {
      facilityId: insertedFacilities[2].id,
      parentId: parentIds[2],
      overallRating: 4,
      staffRating: 5,
      activitiesRating: 4,
      title: "Caring staff, great facility",
      body: "The teachers are wonderful and always keep us updated on Ava's progress. The facility is clean and well-maintained.",
      wouldRecommend: true,
    },
    // David (parentIds[3]) reviews Sunshine Kids (facility 0) - has active enrollment
    {
      facilityId: insertedFacilities[0].id,
      parentId: parentIds[3],
      overallRating: 5,
      safetyRating: 5,
      staffRating: 5,
      activitiesRating: 5,
      valueRating: 4,
      title: "Best daycare in Springfield",
      body: "Sophia has been attending the drop-in program and absolutely loves it. The STEM and music programs are top notch.",
      wouldRecommend: true,
    },
    // Emma (parentIds[4]) reviews Little Explorers (facility 1) - has withdrawn enrollment
    {
      facilityId: insertedFacilities[1].id,
      parentId: parentIds[4],
      overallRating: 3,
      safetyRating: 4,
      staffRating: 3,
      activitiesRating: 3,
      valueRating: 3,
      title: "Good but we moved on",
      body: "It was a decent experience overall. We relocated so had to withdraw but the time our kids spent there was fine.",
      wouldRecommend: false,
    },
  ];
  const insertedReviews = await db.insert(reviews).values(reviewData).returning();

  // Create review responses from facility admins
  const responseData = [
    {
      reviewId: insertedReviews[0].id,
      responderId: adminIds[0],
      body: "Thank you so much for the kind words, Sarah! We love having Olivia and Ethan with us. Looking forward to another great year!",
    },
    {
      reviewId: insertedReviews[1].id,
      responderId: adminIds[1],
      body: "Thanks for the review, Mike! We're glad Mia enjoys the bilingual program. We're always working to provide the best value for families.",
    },
    {
      reviewId: insertedReviews[3].id,
      responderId: adminIds[0],
      body: "Thank you David! We're thrilled that Sophia enjoys our programs. Our team works hard to create engaging STEM and music experiences.",
    },
  ];
  await db.insert(reviewResponses).values(responseData);

  // Update facility rating averages based on seeded reviews
  for (const facility of insertedFacilities) {
    const [result] = await db
      .select({
        avg: sql`AVG(overall_rating)::numeric(2,1)`,
        count: sql`COUNT(*)::int`,
      })
      .from(reviews)
      .where(sql`${reviews.facilityId} = ${facility.id}`);

    await db
      .update(facilities)
      .set({
        ratingAverage: String(result.avg) !== "null" ? String(result.avg) : null,
        reviewCount: Number(result.count),
      })
      .where(sql`${facilities.id} = ${facility.id}`);
  }

  console.log("Seeding complete!");
  console.log(`  - ${parentData.length} parents`);
  console.log(`  - ${adminData.length} admins`);
  console.log(`  - ${staffData.length} staff`);
  console.log(`  - ${userRolesData.length} user roles`);
  console.log(`  - ${insertedFacilities.length} facilities`);
  console.log(`  - ${hoursData.length} facility hours`);
  console.log(`  - ${photoData.length} facility photos`);
  console.log(`  - ${servicesData.length} facility services`);
  console.log(`  - ${insertedChildren.length} children`);
  console.log(`  - ${enrollmentData.length} enrollments`);
  console.log(`  - ${historyData.length} enrollment status history records`);
  console.log(`  - ${facilityStaffData.length} facility staff assignments`);
  console.log(`  - ${favoritesData.length} favorites`);
  console.log(`  - ${attendanceRecords.length} attendance records`);
  console.log(`  - ${insertedConversations.length} conversations`);
  console.log(`  - ${participantsData.length} conversation participants`);
  console.log(`  - ${messageData.length} messages`);
  console.log(`  - ${notificationData.length} notifications`);
  console.log(`  - ${prefData.length} notification preferences`);
  console.log(`  - ${activityRecords.length} activity entries`);
  console.log(`  - ${dailyReportRecords.length} daily reports`);
  console.log(`  - ${templateData.length} report templates`);
  console.log(`  - ${reviewData.length} reviews`);
  console.log(`  - ${responseData.length} review responses`);
  console.log(`\nAll users have password: password123`);

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
