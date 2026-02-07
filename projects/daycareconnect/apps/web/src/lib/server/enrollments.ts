import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import {
  db,
  children,
  enrollments,
  enrollmentStatusHistory,
  facilities,
  users,
  eq,
  and,
} from "@daycare-hub/db";
import { createEnrollmentSchema, withdrawEnrollmentSchema } from "@daycare-hub/shared";
import { assertChildOwner, assertEnrollmentOwner } from "../parent-auth";
import { sendNotification } from "./notification-service";

export const getMyEnrollments = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const results = await db
      .select({
        id: enrollments.id,
        status: enrollments.status,
        scheduleType: enrollments.scheduleType,
        startDate: enrollments.startDate,
        endDate: enrollments.endDate,
        notes: enrollments.notes,
        createdAt: enrollments.createdAt,
        childFirstName: children.firstName,
        childLastName: children.lastName,
        childId: children.id,
        facilityName: facilities.name,
        facilityId: facilities.id,
        facilityCity: facilities.city,
        facilityState: facilities.state,
      })
      .from(enrollments)
      .innerJoin(children, eq(enrollments.childId, children.id))
      .innerJoin(facilities, eq(enrollments.facilityId, facilities.id))
      .where(eq(children.parentId, session.user.id))
      .orderBy(enrollments.createdAt);

    return results;
  }
);

export const getEnrollment = createServerFn({ method: "GET" })
  .inputValidator((data: { enrollmentId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertEnrollmentOwner(data.enrollmentId, session.user.id);

    const [enrollment] = await db
      .select({
        id: enrollments.id,
        status: enrollments.status,
        scheduleType: enrollments.scheduleType,
        startDate: enrollments.startDate,
        endDate: enrollments.endDate,
        notes: enrollments.notes,
        createdAt: enrollments.createdAt,
        updatedAt: enrollments.updatedAt,
        childId: children.id,
        childFirstName: children.firstName,
        childLastName: children.lastName,
        childDateOfBirth: children.dateOfBirth,
        facilityId: facilities.id,
        facilityName: facilities.name,
        facilityAddress: facilities.address,
        facilityCity: facilities.city,
        facilityState: facilities.state,
        facilityPhone: facilities.phone,
      })
      .from(enrollments)
      .innerJoin(children, eq(enrollments.childId, children.id))
      .innerJoin(facilities, eq(enrollments.facilityId, facilities.id))
      .where(eq(enrollments.id, data.enrollmentId))
      .limit(1);

    if (!enrollment) throw new Error("Enrollment not found");

    return enrollment;
  });

export const getEnrollmentHistory = createServerFn({ method: "GET" })
  .inputValidator((data: { enrollmentId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertEnrollmentOwner(data.enrollmentId, session.user.id);

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

    return history;
  });

export const createEnrollment = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => createEnrollmentSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertChildOwner(data.childId, session.user.id);

    // Check for existing active/pending enrollment at this facility for this child
    const [existing] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.childId, data.childId),
          eq(enrollments.facilityId, data.facilityId),
          eq(enrollments.status, "pending")
        )
      )
      .limit(1);

    if (existing) {
      throw new Error("This child already has a pending application at this facility");
    }

    const [activeExisting] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.childId, data.childId),
          eq(enrollments.facilityId, data.facilityId),
          eq(enrollments.status, "active")
        )
      )
      .limit(1);

    if (activeExisting) {
      throw new Error("This child is already enrolled at this facility");
    }

    // Insert enrollment and first history record in sequence
    const [enrollment] = await db
      .insert(enrollments)
      .values({
        childId: data.childId,
        facilityId: data.facilityId,
        scheduleType: data.scheduleType,
        startDate: data.startDate,
        notes: data.notes || null,
        status: "pending",
      })
      .returning();

    await db.insert(enrollmentStatusHistory).values({
      enrollmentId: enrollment.id,
      status: "pending",
      changedBy: session.user.id,
      reason: "Application submitted",
    });

    // Notify facility owner
    const [facility] = await db
      .select({ ownerId: facilities.ownerId, name: facilities.name })
      .from(facilities)
      .where(eq(facilities.id, data.facilityId))
      .limit(1);

    const [child] = await db
      .select({ firstName: children.firstName, lastName: children.lastName })
      .from(children)
      .where(eq(children.id, data.childId))
      .limit(1);

    if (facility) {
      await sendNotification({
        type: "enrollment_submitted",
        recipientId: facility.ownerId,
        data: {
          parentName: session.user.name,
          childName: `${child.firstName} ${child.lastName}`,
          facilityName: facility.name,
        },
        actionUrl: `/facility/${data.facilityId}/enrollments`,
      });
    }

    return enrollment;
  });

export const withdrawEnrollment = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { enrollmentId: string; reason?: string }) => ({
      enrollmentId: data.enrollmentId,
      ...withdrawEnrollmentSchema.parse(data),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertEnrollmentOwner(data.enrollmentId, session.user.id);

    const [enrollment] = await db
      .select({ status: enrollments.status })
      .from(enrollments)
      .where(eq(enrollments.id, data.enrollmentId))
      .limit(1);

    if (!enrollment) throw new Error("Enrollment not found");
    if (enrollment.status === "withdrawn") throw new Error("Already withdrawn");

    const [updated] = await db
      .update(enrollments)
      .set({
        status: "withdrawn",
        endDate: new Date().toISOString().split("T")[0],
        updatedAt: new Date(),
      })
      .where(eq(enrollments.id, data.enrollmentId))
      .returning();

    await db.insert(enrollmentStatusHistory).values({
      enrollmentId: data.enrollmentId,
      status: "withdrawn",
      changedBy: session.user.id,
      reason: data.reason || "Withdrawn by parent",
    });

    // Notify facility owner
    const [enrollmentDetail] = await db
      .select({
        facilityId: enrollments.facilityId,
        childFirstName: children.firstName,
        childLastName: children.lastName,
      })
      .from(enrollments)
      .innerJoin(children, eq(enrollments.childId, children.id))
      .where(eq(enrollments.id, data.enrollmentId))
      .limit(1);

    if (enrollmentDetail) {
      const [facility] = await db
        .select({ ownerId: facilities.ownerId, name: facilities.name })
        .from(facilities)
        .where(eq(facilities.id, enrollmentDetail.facilityId))
        .limit(1);

      if (facility) {
        await sendNotification({
          type: "enrollment_withdrawn",
          recipientId: facility.ownerId,
          data: {
            parentName: session.user.name,
            childName: `${enrollmentDetail.childFirstName} ${enrollmentDetail.childLastName}`,
            facilityName: facility.name,
          },
          actionUrl: `/facility/${enrollmentDetail.facilityId}/enrollments`,
        });
      }
    }

    return updated;
  });
