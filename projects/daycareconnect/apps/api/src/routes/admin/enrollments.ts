import { Hono } from "hono";
import {
  db,
  enrollments,
  enrollmentStatusHistory,
  children,
  users,
  facilities,
  eq,
  and,
  inArray,
} from "@daycare-hub/db";
import { assertFacilityPermission } from "../../lib/facility-auth";
import { sendNotification } from "../../lib/notification-service";

const app = new Hono();

// GET /:facilityId - Get facility enrollments
app.get("/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const status = c.req.query("status");

  await assertFacilityPermission(facilityId, userId, "enrollments:manage");

  const conditions = [eq(enrollments.facilityId, facilityId)];
  if (status && status !== "all") {
    conditions.push(eq(enrollments.status, status as any));
  }

  const results = await db
    .select({
      id: enrollments.id,
      status: enrollments.status,
      scheduleType: enrollments.scheduleType,
      startDate: enrollments.startDate,
      endDate: enrollments.endDate,
      notes: enrollments.notes,
      createdAt: enrollments.createdAt,
      childId: children.id,
      childFirstName: children.firstName,
      childLastName: children.lastName,
      childDateOfBirth: children.dateOfBirth,
      parentName: users.name,
      parentEmail: users.email,
      parentPhone: users.phone,
    })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .innerJoin(users, eq(children.parentId, users.id))
    .where(and(...conditions))
    .orderBy(enrollments.createdAt);

  return c.json(results);
});

// GET /detail/:enrollmentId - Get enrollment detail
app.get("/detail/:enrollmentId", async (c) => {
  const userId = c.get("userId") as string;
  const enrollmentId = c.req.param("enrollmentId");
  const facilityId = c.req.query("facilityId");

  if (!facilityId) throw new Error("facilityId is required");
  await assertFacilityPermission(facilityId, userId, "enrollments:manage");

  const [enrollment] = await db
    .select({
      id: enrollments.id,
      status: enrollments.status,
      scheduleType: enrollments.scheduleType,
      startDate: enrollments.startDate,
      endDate: enrollments.endDate,
      notes: enrollments.notes,
      createdAt: enrollments.createdAt,
      childId: children.id,
      childFirstName: children.firstName,
      childLastName: children.lastName,
      childDateOfBirth: children.dateOfBirth,
      childAllergies: children.allergies,
      childMedicalNotes: children.medicalNotes,
      parentName: users.name,
      parentEmail: users.email,
      parentPhone: users.phone,
    })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .innerJoin(users, eq(children.parentId, users.id))
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment) throw new Error("Enrollment not found");

  const history = await db
    .select({
      id: enrollmentStatusHistory.id,
      status: enrollmentStatusHistory.status,
      reason: enrollmentStatusHistory.reason,
      createdAt: enrollmentStatusHistory.createdAt,
      changedByName: users.name,
    })
    .from(enrollmentStatusHistory)
    .innerJoin(users, eq(enrollmentStatusHistory.changedBy, users.id))
    .where(eq(enrollmentStatusHistory.enrollmentId, enrollmentId))
    .orderBy(enrollmentStatusHistory.createdAt);

  return c.json({ ...enrollment, history });
});

// POST /:enrollmentId/approve - Approve an enrollment
app.post("/:enrollmentId/approve", async (c) => {
  const userId = c.get("userId") as string;
  const enrollmentId = c.req.param("enrollmentId");
  const body = await c.req.json();

  const [enrollment] = await db
    .select({
      id: enrollments.id,
      facilityId: enrollments.facilityId,
      status: enrollments.status,
    })
    .from(enrollments)
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment) throw new Error("Enrollment not found");
  await assertFacilityPermission(enrollment.facilityId, userId, "enrollments:manage");

  if (enrollment.status !== "pending") {
    throw new Error("Can only approve pending enrollments");
  }

  const [updated] = await db
    .update(enrollments)
    .set({
      status: "active",
      startDate: body.startDate || new Date().toISOString().split("T")[0],
      updatedAt: new Date(),
    })
    .where(eq(enrollments.id, enrollmentId))
    .returning();

  await db.insert(enrollmentStatusHistory).values({
    enrollmentId,
    status: "active",
    changedBy: userId,
    reason: "Application approved by facility admin",
  });

  // Notify parent
  const [enrollmentDetail] = await db
    .select({
      childFirstName: children.firstName,
      childLastName: children.lastName,
      parentId: children.parentId,
      facilityName: facilities.name,
      facilityId: enrollments.facilityId,
    })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .innerJoin(facilities, eq(enrollments.facilityId, facilities.id))
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);

  if (enrollmentDetail) {
    await sendNotification({
      type: "enrollment_approved",
      recipientId: enrollmentDetail.parentId,
      data: {
        childName: `${enrollmentDetail.childFirstName} ${enrollmentDetail.childLastName}`,
        facilityName: enrollmentDetail.facilityName,
      },
      actionUrl: `/parent/children`,
    });
  }

  return c.json(updated);
});

// POST /:enrollmentId/reject - Reject an enrollment
app.post("/:enrollmentId/reject", async (c) => {
  const userId = c.get("userId") as string;
  const enrollmentId = c.req.param("enrollmentId");
  const body = await c.req.json();

  const [enrollment] = await db
    .select({
      id: enrollments.id,
      facilityId: enrollments.facilityId,
      status: enrollments.status,
    })
    .from(enrollments)
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment) throw new Error("Enrollment not found");
  await assertFacilityPermission(enrollment.facilityId, userId, "enrollments:manage");

  if (enrollment.status !== "pending") {
    throw new Error("Can only reject pending enrollments");
  }

  const [updated] = await db
    .update(enrollments)
    .set({
      status: "rejected",
      updatedAt: new Date(),
    })
    .where(eq(enrollments.id, enrollmentId))
    .returning();

  await db.insert(enrollmentStatusHistory).values({
    enrollmentId,
    status: "rejected",
    changedBy: userId,
    reason: body.reason,
  });

  // Notify parent
  const [enrollmentDetail] = await db
    .select({
      childFirstName: children.firstName,
      childLastName: children.lastName,
      parentId: children.parentId,
      facilityName: facilities.name,
    })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .innerJoin(facilities, eq(enrollments.facilityId, facilities.id))
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);

  if (enrollmentDetail) {
    await sendNotification({
      type: "enrollment_rejected",
      recipientId: enrollmentDetail.parentId,
      data: {
        childName: `${enrollmentDetail.childFirstName} ${enrollmentDetail.childLastName}`,
        facilityName: enrollmentDetail.facilityName,
      },
      actionUrl: `/parent/children`,
    });
  }

  return c.json(updated);
});

// POST /bulk - Bulk enrollment action (approve/reject)
app.post("/bulk", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { enrollmentIds, action, reason } = body;

  const targetEnrollments = await db
    .select({
      id: enrollments.id,
      facilityId: enrollments.facilityId,
      status: enrollments.status,
    })
    .from(enrollments)
    .where(inArray(enrollments.id, enrollmentIds));

  if (!targetEnrollments.length) {
    throw new Error("No enrollments found");
  }

  // Verify manager access for the facility
  const facilityId = targetEnrollments[0].facilityId;
  await assertFacilityPermission(facilityId, userId, "enrollments:manage");

  const pendingOnly = targetEnrollments.filter((e) => e.status === "pending");
  if (!pendingOnly.length) {
    throw new Error("No pending enrollments to process");
  }

  const pendingIds = pendingOnly.map((e) => e.id);
  const newStatus = action === "approve" ? "active" : "rejected";
  const statusReason =
    action === "approve"
      ? "Bulk approved by facility admin"
      : reason!;

  await db
    .update(enrollments)
    .set({
      status: newStatus as any,
      startDate:
        action === "approve"
          ? new Date().toISOString().split("T")[0]
          : undefined,
      updatedAt: new Date(),
    })
    .where(inArray(enrollments.id, pendingIds));

  await db.insert(enrollmentStatusHistory).values(
    pendingIds.map((enrollmentId) => ({
      enrollmentId,
      status: newStatus as any,
      changedBy: userId,
      reason: statusReason,
    }))
  );

  return c.json({ processed: pendingIds.length });
});

export { app as adminEnrollmentsRoutes };
