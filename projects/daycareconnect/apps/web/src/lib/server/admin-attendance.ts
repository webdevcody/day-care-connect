import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import {
  db,
  attendance,
  enrollments,
  children,
  users,
  facilities,
  eq,
  and,
} from "@daycare-hub/db";
import { checkInSchema, checkOutSchema, markAbsentSchema } from "@daycare-hub/shared";
import { assertFacilityStaffOrOwner } from "../facility-auth";
import { sendNotification } from "./notification-service";

export const getDailyAttendance = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string; date: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityStaffOrOwner(data.facilityId, session.user.id);

    // Find active enrollments that don't have attendance records for this date
    const activeEnrollments = await db
      .select({
        id: enrollments.id,
        childId: enrollments.childId,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.facilityId, data.facilityId),
          eq(enrollments.status, "active")
        )
      );

    if (activeEnrollments.length > 0) {
      // Check which enrollments already have attendance records
      const existingRecords = await db
        .select({ enrollmentId: attendance.enrollmentId })
        .from(attendance)
        .where(
          and(
            eq(attendance.facilityId, data.facilityId),
            eq(attendance.date, data.date)
          )
        );

      const existingEnrollmentIds = new Set(
        existingRecords.map((r) => r.enrollmentId)
      );

      const missing = activeEnrollments.filter(
        (e) => !existingEnrollmentIds.has(e.id)
      );

      if (missing.length > 0) {
        await db.insert(attendance).values(
          missing.map((e) => ({
            enrollmentId: e.id,
            childId: e.childId,
            facilityId: data.facilityId,
            date: data.date,
            status: "expected" as const,
          }))
        );
      }
    }

    // Return all attendance for the date
    return db
      .select({
        id: attendance.id,
        enrollmentId: attendance.enrollmentId,
        childId: attendance.childId,
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.status,
        absenceReason: attendance.absenceReason,
        notes: attendance.notes,
        childFirstName: children.firstName,
        childLastName: children.lastName,
        scheduleType: enrollments.scheduleType,
        parentName: users.name,
        parentPhone: users.phone,
      })
      .from(attendance)
      .innerJoin(children, eq(attendance.childId, children.id))
      .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
      .innerJoin(users, eq(children.parentId, users.id))
      .where(
        and(
          eq(attendance.facilityId, data.facilityId),
          eq(attendance.date, data.date)
        )
      )
      .orderBy(children.firstName);
  });

export const checkInChild = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => checkInSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [record] = await db
      .select({
        id: attendance.id,
        facilityId: attendance.facilityId,
        status: attendance.status,
      })
      .from(attendance)
      .where(eq(attendance.id, data.attendanceId))
      .limit(1);

    if (!record) throw new Error("Attendance record not found");
    await assertFacilityStaffOrOwner(record.facilityId, session.user.id);

    const [updated] = await db
      .update(attendance)
      .set({
        checkInTime: new Date(),
        status: "present",
        checkedInBy: session.user.id,
      })
      .where(eq(attendance.id, data.attendanceId))
      .returning();

    // Notify parent of check-in
    const [detail] = await db
      .select({
        childFirstName: children.firstName,
        childLastName: children.lastName,
        parentId: children.parentId,
        facilityName: facilities.name,
      })
      .from(attendance)
      .innerJoin(children, eq(attendance.childId, children.id))
      .innerJoin(facilities, eq(attendance.facilityId, facilities.id))
      .where(eq(attendance.id, data.attendanceId))
      .limit(1);

    if (detail) {
      await sendNotification({
        type: "check_in",
        recipientId: detail.parentId,
        data: {
          childName: `${detail.childFirstName} ${detail.childLastName}`,
          facilityName: detail.facilityName,
        },
        actionUrl: `/parent`,
      });
    }

    return updated;
  });

export const checkOutChild = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => checkOutSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [record] = await db
      .select({
        id: attendance.id,
        facilityId: attendance.facilityId,
      })
      .from(attendance)
      .where(eq(attendance.id, data.attendanceId))
      .limit(1);

    if (!record) throw new Error("Attendance record not found");
    await assertFacilityStaffOrOwner(record.facilityId, session.user.id);

    const [updated] = await db
      .update(attendance)
      .set({
        checkOutTime: new Date(),
        checkedOutBy: session.user.id,
      })
      .where(eq(attendance.id, data.attendanceId))
      .returning();

    // Notify parent of check-out
    const [detail] = await db
      .select({
        childFirstName: children.firstName,
        childLastName: children.lastName,
        parentId: children.parentId,
        facilityName: facilities.name,
      })
      .from(attendance)
      .innerJoin(children, eq(attendance.childId, children.id))
      .innerJoin(facilities, eq(attendance.facilityId, facilities.id))
      .where(eq(attendance.id, data.attendanceId))
      .limit(1);

    if (detail) {
      await sendNotification({
        type: "check_out",
        recipientId: detail.parentId,
        data: {
          childName: `${detail.childFirstName} ${detail.childLastName}`,
          facilityName: detail.facilityName,
        },
        actionUrl: `/parent`,
      });
    }

    return updated;
  });

export const markAbsent = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => markAbsentSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [record] = await db
      .select({
        id: attendance.id,
        facilityId: attendance.facilityId,
      })
      .from(attendance)
      .where(eq(attendance.id, data.attendanceId))
      .limit(1);

    if (!record) throw new Error("Attendance record not found");
    await assertFacilityStaffOrOwner(record.facilityId, session.user.id);

    const [updated] = await db
      .update(attendance)
      .set({
        status: "absent",
        absenceReason: data.reason,
        notes: data.notes || null,
      })
      .where(eq(attendance.id, data.attendanceId))
      .returning();

    return updated;
  });
