import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
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
import {
  approveEnrollmentSchema,
  rejectEnrollmentSchema,
  bulkEnrollmentActionSchema,
} from "@daycare-hub/shared";
import { assertFacilityManager } from "../facility-auth";
import { sendNotification } from "./notification-service";

export const getFacilityEnrollments = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string; status?: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const conditions = [eq(enrollments.facilityId, data.facilityId)];
    if (data.status && data.status !== "all") {
      conditions.push(eq(enrollments.status, data.status as any));
    }

    return db
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
  });

export const getEnrollmentDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { enrollmentId: string; facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

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
      .where(eq(enrollments.id, data.enrollmentId))
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
      .where(eq(enrollmentStatusHistory.enrollmentId, data.enrollmentId))
      .orderBy(enrollmentStatusHistory.createdAt);

    return { ...enrollment, history };
  });

export const approveEnrollment = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => approveEnrollmentSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [enrollment] = await db
      .select({
        id: enrollments.id,
        facilityId: enrollments.facilityId,
        status: enrollments.status,
      })
      .from(enrollments)
      .where(eq(enrollments.id, data.enrollmentId))
      .limit(1);

    if (!enrollment) throw new Error("Enrollment not found");
    await assertFacilityManager(enrollment.facilityId, session.user.id);

    if (enrollment.status !== "pending") {
      throw new Error("Can only approve pending enrollments");
    }

    const [updated] = await db
      .update(enrollments)
      .set({
        status: "active",
        startDate: data.startDate || new Date().toISOString().split("T")[0],
        updatedAt: new Date(),
      })
      .where(eq(enrollments.id, data.enrollmentId))
      .returning();

    await db.insert(enrollmentStatusHistory).values({
      enrollmentId: data.enrollmentId,
      status: "active",
      changedBy: session.user.id,
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
      .where(eq(enrollments.id, data.enrollmentId))
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

    return updated;
  });

export const rejectEnrollment = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => rejectEnrollmentSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [enrollment] = await db
      .select({
        id: enrollments.id,
        facilityId: enrollments.facilityId,
        status: enrollments.status,
      })
      .from(enrollments)
      .where(eq(enrollments.id, data.enrollmentId))
      .limit(1);

    if (!enrollment) throw new Error("Enrollment not found");
    await assertFacilityManager(enrollment.facilityId, session.user.id);

    if (enrollment.status !== "pending") {
      throw new Error("Can only reject pending enrollments");
    }

    const [updated] = await db
      .update(enrollments)
      .set({
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(enrollments.id, data.enrollmentId))
      .returning();

    await db.insert(enrollmentStatusHistory).values({
      enrollmentId: data.enrollmentId,
      status: "rejected",
      changedBy: session.user.id,
      reason: data.reason,
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
      .where(eq(enrollments.id, data.enrollmentId))
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

    return updated;
  });

export const bulkEnrollmentAction = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => bulkEnrollmentActionSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const targetEnrollments = await db
      .select({
        id: enrollments.id,
        facilityId: enrollments.facilityId,
        status: enrollments.status,
      })
      .from(enrollments)
      .where(inArray(enrollments.id, data.enrollmentIds));

    if (!targetEnrollments.length) {
      throw new Error("No enrollments found");
    }

    // Verify manager access for the facility
    const facilityId = targetEnrollments[0].facilityId;
    await assertFacilityManager(facilityId, session.user.id);

    const pendingOnly = targetEnrollments.filter((e) => e.status === "pending");
    if (!pendingOnly.length) {
      throw new Error("No pending enrollments to process");
    }

    const pendingIds = pendingOnly.map((e) => e.id);
    const newStatus = data.action === "approve" ? "active" : "rejected";
    const reason =
      data.action === "approve"
        ? "Bulk approved by facility admin"
        : data.reason!;

    await db
      .update(enrollments)
      .set({
        status: newStatus as any,
        startDate:
          data.action === "approve"
            ? new Date().toISOString().split("T")[0]
            : undefined,
        updatedAt: new Date(),
      })
      .where(inArray(enrollments.id, pendingIds));

    await db.insert(enrollmentStatusHistory).values(
      pendingIds.map((enrollmentId) => ({
        enrollmentId,
        status: newStatus as any,
        changedBy: session.user.id,
        reason,
      }))
    );

    return { processed: pendingIds.length };
  });
