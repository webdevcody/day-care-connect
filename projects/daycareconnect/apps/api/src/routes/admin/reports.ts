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
    .where(and(eq(enrollments.facilityId, facilityId), eq(enrollments.status, "active")));

  const numActive = activeCount[0]?.count ?? 0;
  const monthlyRate = parseFloat(facility?.monthlyRate || "0");

  // Compute range in months
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

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

// GET /enrollment-analytics - Daily enrollments for a given month + monthly overview
// Query params: facilityId (required), month (optional, YYYY-MM, defaults to current month)
app.get("/enrollment-analytics", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.query("facilityId");
  const monthParam = c.req.query("month"); // e.g. "2026-02"

  if (!facilityId) throw new Error("facilityId is required");

  await assertFacilityPermission(facilityId, userId, "reports:view");

  // Determine the target month for the daily view
  const now = new Date();
  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth(); // 0-indexed
  if (monthParam) {
    const [y, m] = monthParam.split("-").map(Number);
    if (y && m) {
      targetYear = y;
      targetMonth = m - 1;
    }
  }

  const monthStart = new Date(targetYear, targetMonth, 1);
  const monthEnd = new Date(targetYear, targetMonth + 1, 0); // last day of month

  // Daily enrollments for the target month
  const dailyEnrollments = await db
    .select({
      date: sql<string>`to_char(${enrollments.createdAt}::date, 'YYYY-MM-DD')`,
      count: count(),
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.facilityId, facilityId),
        gte(enrollments.createdAt, monthStart),
        lte(enrollments.createdAt, new Date(targetYear, targetMonth + 1, 0, 23, 59, 59))
      )
    )
    .groupBy(sql`${enrollments.createdAt}::date`)
    .orderBy(sql`${enrollments.createdAt}::date`);

  // Fill in every day of the month with zero counts where missing
  const dailyMap = new Map(dailyEnrollments.map((d) => [d.date, d.count]));
  const daily: Array<{ date: string; count: number }> = [];
  const daysInMonth = monthEnd.getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    daily.push({ date: key, count: dailyMap.get(key) ?? 0 });
  }

  // Monthly enrollments for the last 12 months (always relative to today)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  const monthlyEnrollments = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${enrollments.createdAt}), 'YYYY-MM')`,
      count: count(),
    })
    .from(enrollments)
    .where(and(eq(enrollments.facilityId, facilityId), gte(enrollments.createdAt, twelveMonthsAgo)))
    .groupBy(sql`date_trunc('month', ${enrollments.createdAt})`)
    .orderBy(sql`date_trunc('month', ${enrollments.createdAt})`);

  // Fill in missing months with zero counts
  const monthlyMap = new Map(monthlyEnrollments.map((m) => [m.month, m.count]));
  const monthly: Array<{ month: string; count: number }> = [];
  const monthCursor = new Date(twelveMonthsAgo);
  for (let i = 0; i < 12; i++) {
    const key = `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, "0")}`;
    monthly.push({ month: key, count: monthlyMap.get(key) ?? 0 });
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  // Summary stats
  const totalSelectedMonth = daily.reduce((sum, d) => sum + d.count, 0);
  const totalLast12Months = monthly.reduce((sum, m) => sum + m.count, 0);

  const selectedMonth = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`;

  return c.json({
    daily,
    monthly,
    selectedMonth,
    totalSelectedMonth,
    totalLast12Months,
  });
});

export { app as adminReportsRoutes };
