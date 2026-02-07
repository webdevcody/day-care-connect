import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import {
  db,
  enrollments,
  attendance,
  facilities,
  eq,
  and,
  sql,
  count,
  gte,
  lte,
} from "@daycare-hub/db";
import { dateRangeSchema } from "@daycare-hub/shared";
import { assertFacilityManager } from "../facility-auth";

export const getEnrollmentReport = createServerFn({ method: "GET" })
  .inputValidator((data: Record<string, unknown>) => dateRangeSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    // Total counts by status
    const statusCounts = await db
      .select({
        status: enrollments.status,
        count: count(),
      })
      .from(enrollments)
      .where(eq(enrollments.facilityId, data.facilityId))
      .groupBy(enrollments.status);

    // Weekly trend - enrollments created per week in the date range
    const weeklyTrend = await db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${enrollments.createdAt}), 'YYYY-MM-DD')`,
        count: count(),
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.facilityId, data.facilityId),
          gte(enrollments.createdAt, new Date(data.startDate)),
          lte(enrollments.createdAt, new Date(data.endDate + "T23:59:59"))
        )
      )
      .groupBy(sql`date_trunc('week', ${enrollments.createdAt})`)
      .orderBy(sql`date_trunc('week', ${enrollments.createdAt})`);

    return {
      statusCounts: Object.fromEntries(statusCounts.map((r) => [r.status, r.count])),
      weeklyTrend: weeklyTrend.map((r) => ({ week: r.week, count: r.count })),
    };
  });

export const getAttendanceReport = createServerFn({ method: "GET" })
  .inputValidator((data: Record<string, unknown>) => dateRangeSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    // Daily attendance rates
    const dailyRates = await db
      .select({
        date: attendance.date,
        status: attendance.status,
        count: count(),
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.facilityId, data.facilityId),
          gte(attendance.date, data.startDate),
          lte(attendance.date, data.endDate)
        )
      )
      .groupBy(attendance.date, attendance.status)
      .orderBy(attendance.date);

    // Aggregate by date
    const dateMap: Record<string, Record<string, number>> = {};
    for (const row of dailyRates) {
      if (!dateMap[row.date]) {
        dateMap[row.date] = { present: 0, absent: 0, expected: 0, late: 0 };
      }
      dateMap[row.date][row.status] = row.count;
    }

    const dailyData = Object.entries(dateMap).map(([date, counts]) => ({
      date,
      present: counts.present || 0,
      absent: counts.absent || 0,
      expected: counts.expected || 0,
      late: counts.late || 0,
    }));

    // Absence breakdown
    const absenceBreakdown = await db
      .select({
        reason: attendance.absenceReason,
        count: count(),
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.facilityId, data.facilityId),
          eq(attendance.status, "absent"),
          gte(attendance.date, data.startDate),
          lte(attendance.date, data.endDate)
        )
      )
      .groupBy(attendance.absenceReason);

    return {
      dailyData,
      absenceBreakdown: absenceBreakdown.map((r) => ({
        reason: r.reason || "unspecified",
        count: r.count,
      })),
    };
  });

export const getRevenueEstimate = createServerFn({ method: "GET" })
  .inputValidator((data: Record<string, unknown>) => dateRangeSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const [facility] = await db
      .select({
        monthlyRate: facilities.monthlyRate,
        weeklyRate: facilities.weeklyRate,
        dailyRate: facilities.dailyRate,
      })
      .from(facilities)
      .where(eq(facilities.id, data.facilityId))
      .limit(1);

    const activeCount = await db
      .select({ count: count() })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.facilityId, data.facilityId),
          eq(enrollments.status, "active")
        )
      );

    const numActive = activeCount[0]?.count ?? 0;
    const monthlyRate = parseFloat(facility?.monthlyRate || "0");

    // Compute range in months
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1;

    // Build monthly estimates
    const monthlyData = [];
    const current = new Date(start);
    for (let i = 0; i < months && i < 12; i++) {
      monthlyData.push({
        month: current.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        estimate: numActive * monthlyRate,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return {
      activeEnrollments: numActive,
      monthlyRate,
      totalEstimate: numActive * monthlyRate * months,
      monthlyData,
    };
  });
