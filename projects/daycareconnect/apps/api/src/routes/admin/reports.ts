import { Hono } from "hono";
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
import { assertFacilityPermission } from "../../lib/facility-auth";

const app = new Hono();

// GET /enrollment - Get enrollment report
app.get("/enrollment", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.query("facilityId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!facilityId) throw new Error("facilityId is required");
  if (!startDate) throw new Error("startDate is required");
  if (!endDate) throw new Error("endDate is required");

  await assertFacilityPermission(facilityId, userId, "reports:view");

  // Total counts by status
  const statusCounts = await db
    .select({
      status: enrollments.status,
      count: count(),
    })
    .from(enrollments)
    .where(eq(enrollments.facilityId, facilityId))
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
        eq(enrollments.facilityId, facilityId),
        gte(enrollments.createdAt, new Date(startDate)),
        lte(enrollments.createdAt, new Date(endDate + "T23:59:59"))
      )
    )
    .groupBy(sql`date_trunc('week', ${enrollments.createdAt})`)
    .orderBy(sql`date_trunc('week', ${enrollments.createdAt})`);

  return c.json({
    statusCounts: Object.fromEntries(statusCounts.map((r) => [r.status, r.count])),
    weeklyTrend: weeklyTrend.map((r) => ({ week: r.week, count: r.count })),
  });
});

// GET /attendance - Get attendance report
app.get("/attendance", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.query("facilityId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!facilityId) throw new Error("facilityId is required");
  if (!startDate) throw new Error("startDate is required");
  if (!endDate) throw new Error("endDate is required");

  await assertFacilityPermission(facilityId, userId, "reports:view");

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
        eq(attendance.facilityId, facilityId),
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
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
        eq(attendance.facilityId, facilityId),
        eq(attendance.status, "absent"),
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
      )
    )
    .groupBy(attendance.absenceReason);

  return c.json({
    dailyData,
    absenceBreakdown: absenceBreakdown.map((r) => ({
      reason: r.reason || "unspecified",
      count: r.count,
    })),
  });
});

// GET /revenue - Get revenue estimate
app.get("/revenue", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.query("facilityId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  if (!facilityId) throw new Error("facilityId is required");
  if (!startDate) throw new Error("startDate is required");
  if (!endDate) throw new Error("endDate is required");

  await assertFacilityPermission(facilityId, userId, "reports:view");

  const [facility] = await db
    .select({
      monthlyRate: facilities.monthlyRate,
      weeklyRate: facilities.weeklyRate,
      dailyRate: facilities.dailyRate,
    })
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  const activeCount = await db
    .select({ count: count() })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.facilityId, facilityId),
        eq(enrollments.status, "active")
      )
    );

  const numActive = activeCount[0]?.count ?? 0;
  const monthlyRate = parseFloat(facility?.monthlyRate || "0");

  // Compute range in months
  const start = new Date(startDate);
  const end = new Date(endDate);
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

  return c.json({
    activeEnrollments: numActive,
    monthlyRate,
    totalEstimate: numActive * monthlyRate * months,
    monthlyData,
  });
});

export { app as adminReportsRoutes };
