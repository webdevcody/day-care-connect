import { Hono } from "hono";
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
import { assertFacilityPermission } from "../../lib/facility-auth";

const app = new Hono();

// GET /:facilityId - Get admin dashboard data
app.get("/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "reports:view");

  const [facility] = await db
    .select({ name: facilities.name, capacity: facilities.capacity })
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (!facility) throw new Error("Facility not found");

  // Enrollment counts by status
  const enrollmentCounts = await db
    .select({
      status: enrollments.status,
      count: count(),
    })
    .from(enrollments)
    .where(eq(enrollments.facilityId, facilityId))
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
        eq(attendance.facilityId, facilityId),
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
        eq(enrollments.facilityId, facilityId),
        eq(enrollments.status, "pending")
      )
    )
    .orderBy(enrollments.createdAt)
    .limit(5);

  return c.json({
    facility,
    enrollmentCounts: enrollmentCountMap,
    attendanceCounts: attendanceCountMap,
    pendingEnrollments,
  });
});

export { app as adminDashboardRoutes };
