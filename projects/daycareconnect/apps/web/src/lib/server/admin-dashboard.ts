import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import {
  db,
  facilities,
  enrollments,
  attendance,
  children,
  users,
  eq,
  and,
  sql,
  count,
} from "@daycare-hub/db";
import { assertFacilityManager } from "../facility-auth";

export const getAdminDashboard = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const [facility] = await db
      .select({ name: facilities.name, capacity: facilities.capacity })
      .from(facilities)
      .where(eq(facilities.id, data.facilityId))
      .limit(1);

    if (!facility) throw new Error("Facility not found");

    // Enrollment counts by status
    const enrollmentCounts = await db
      .select({
        status: enrollments.status,
        count: count(),
      })
      .from(enrollments)
      .where(eq(enrollments.facilityId, data.facilityId))
      .groupBy(enrollments.status);

    const enrollmentCountMap: Record<string, number> = {};
    for (const row of enrollmentCounts) {
      enrollmentCountMap[row.status] = row.count;
    }

    // Today's attendance summary
    const today = new Date().toISOString().split("T")[0];
    const attendanceSummary = await db
      .select({
        status: attendance.status,
        count: count(),
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.facilityId, data.facilityId),
          eq(attendance.date, today)
        )
      )
      .groupBy(attendance.status);

    const attendanceCountMap: Record<string, number> = {};
    for (const row of attendanceSummary) {
      attendanceCountMap[row.status] = row.count;
    }

    // Top 5 pending enrollments with child + parent info
    const pendingEnrollments = await db
      .select({
        id: enrollments.id,
        scheduleType: enrollments.scheduleType,
        createdAt: enrollments.createdAt,
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
      .where(
        and(
          eq(enrollments.facilityId, data.facilityId),
          eq(enrollments.status, "pending")
        )
      )
      .orderBy(enrollments.createdAt)
      .limit(5);

    return {
      facility,
      enrollmentCounts: enrollmentCountMap,
      attendanceCounts: attendanceCountMap,
      pendingEnrollments,
    };
  });
