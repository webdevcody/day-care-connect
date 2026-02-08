import { Hono } from "hono";
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
import { assertFacilityStaffOrOwner } from "../../lib/facility-auth";
import { sendNotification } from "../../lib/notification-service";

const app = new Hono();

// GET /:facilityId/:date - Get daily attendance
app.get("/:facilityId/:date", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const date = c.req.param("date");

  await assertFacilityStaffOrOwner(facilityId, userId);

  // Find active enrollments that don't have attendance records for this date
  const activeEnrollments = await db
    .select({
      id: enrollments.id,
      childId: enrollments.childId,
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.facilityId, facilityId),
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
          eq(attendance.facilityId, facilityId),
          eq(attendance.date, date)
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
          facilityId: facilityId,
          date: date,
          status: "expected" as const,
        }))
      );
    }
  }

  // Return all attendance for the date
  const results = await db
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
        eq(attendance.facilityId, facilityId),
        eq(attendance.date, date)
      )
    )
    .orderBy(children.firstName);

  return c.json(results);
});

// POST /check-in - Check in a child
app.post("/check-in", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { attendanceId } = body;

  const [record] = await db
    .select({
      id: attendance.id,
      facilityId: attendance.facilityId,
      status: attendance.status,
    })
    .from(attendance)
    .where(eq(attendance.id, attendanceId))
    .limit(1);

  if (!record) throw new Error("Attendance record not found");
  await assertFacilityStaffOrOwner(record.facilityId, userId);

  const [updated] = await db
    .update(attendance)
    .set({
      checkInTime: new Date(),
      status: "present",
      checkedInBy: userId,
    })
    .where(eq(attendance.id, attendanceId))
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
    .where(eq(attendance.id, attendanceId))
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

  return c.json(updated);
});

// POST /check-out - Check out a child
app.post("/check-out", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { attendanceId } = body;

  const [record] = await db
    .select({
      id: attendance.id,
      facilityId: attendance.facilityId,
    })
    .from(attendance)
    .where(eq(attendance.id, attendanceId))
    .limit(1);

  if (!record) throw new Error("Attendance record not found");
  await assertFacilityStaffOrOwner(record.facilityId, userId);

  const [updated] = await db
    .update(attendance)
    .set({
      checkOutTime: new Date(),
      checkedOutBy: userId,
    })
    .where(eq(attendance.id, attendanceId))
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
    .where(eq(attendance.id, attendanceId))
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

  return c.json(updated);
});

// POST /mark-absent - Mark a child as absent
app.post("/mark-absent", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { attendanceId, reason, notes } = body;

  const [record] = await db
    .select({
      id: attendance.id,
      facilityId: attendance.facilityId,
    })
    .from(attendance)
    .where(eq(attendance.id, attendanceId))
    .limit(1);

  if (!record) throw new Error("Attendance record not found");
  await assertFacilityStaffOrOwner(record.facilityId, userId);

  const [updated] = await db
    .update(attendance)
    .set({
      status: "absent",
      absenceReason: reason,
      notes: notes || null,
    })
    .where(eq(attendance.id, attendanceId))
    .returning();

  return c.json(updated);
});

export { app as adminAttendanceRoutes };
