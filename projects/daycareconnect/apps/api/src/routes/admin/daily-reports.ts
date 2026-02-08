import { Hono } from "hono";
import {
  db,
  dailyReports,
  activityEntries,
  enrollments,
  children,
  facilities,
  eq,
  and,
  sql,
} from "@daycare-hub/db";
import { assertFacilityStaffOrOwner } from "../../lib/facility-auth";
import { sendNotification } from "../../lib/notification-service";

const app = new Hono();

// GET /:facilityId/:date - Get daily reports
app.get("/:facilityId/:date", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const date = c.req.param("date");
  const status = c.req.query("status");

  await assertFacilityStaffOrOwner(facilityId, userId);

  const dateFilter = date || new Date().toISOString().split("T")[0];

  // Auto-create draft reports for enrolled children that don't have one for this date
  const activeEnrollments = await db
    .select({ childId: enrollments.childId })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.facilityId, facilityId),
        eq(enrollments.status, "active")
      )
    );

  if (activeEnrollments.length > 0) {
    await db
      .insert(dailyReports)
      .values(
        activeEnrollments.map((e) => ({
          childId: e.childId,
          facilityId,
          date: dateFilter,
        }))
      )
      .onConflictDoNothing();
  }

  const conditions = [
    eq(dailyReports.facilityId, facilityId),
    eq(dailyReports.date, dateFilter),
  ];

  if (status) {
    conditions.push(eq(dailyReports.status, status as any));
  }

  const results = await db
    .select({
      id: dailyReports.id,
      childId: dailyReports.childId,
      date: dailyReports.date,
      summary: dailyReports.summary,
      status: dailyReports.status,
      publishedAt: dailyReports.publishedAt,
      createdAt: dailyReports.createdAt,
      childFirstName: children.firstName,
      childLastName: children.lastName,
      entryCount: sql<number>`(
        SELECT count(*)::int FROM activity_entries
        WHERE activity_entries.child_id = ${dailyReports.childId}
        AND activity_entries.facility_id = ${dailyReports.facilityId}
        AND activity_entries.occurred_at::date = ${dailyReports.date}
      )`,
    })
    .from(dailyReports)
    .innerJoin(children, eq(dailyReports.childId, children.id))
    .where(and(...conditions))
    .orderBy(children.firstName);

  return c.json(results);
});

// POST / - Create or get a daily report
app.post("/", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { facilityId, childId, date } = body;

  await assertFacilityStaffOrOwner(facilityId, userId);

  const [existing] = await db
    .select()
    .from(dailyReports)
    .where(
      and(
        eq(dailyReports.childId, childId),
        eq(dailyReports.facilityId, facilityId),
        eq(dailyReports.date, date)
      )
    )
    .limit(1);

  if (existing) return c.json(existing);

  const [report] = await db
    .insert(dailyReports)
    .values({
      childId,
      facilityId,
      date,
    })
    .returning();

  return c.json(report);
});

// PUT /:reportId - Update a daily report
app.put("/:reportId", async (c) => {
  const userId = c.get("userId") as string;
  const reportId = c.req.param("reportId");
  const body = await c.req.json();
  const { summary } = body;

  const [report] = await db
    .select({
      id: dailyReports.id,
      facilityId: dailyReports.facilityId,
      status: dailyReports.status,
    })
    .from(dailyReports)
    .where(eq(dailyReports.id, reportId))
    .limit(1);

  if (!report) throw new Error("Report not found");
  await assertFacilityStaffOrOwner(report.facilityId, userId);

  const [updated] = await db
    .update(dailyReports)
    .set({ summary, updatedAt: new Date() })
    .where(eq(dailyReports.id, reportId))
    .returning();

  return c.json(updated);
});

// POST /:reportId/publish - Publish a daily report
app.post("/:reportId/publish", async (c) => {
  const userId = c.get("userId") as string;
  const reportId = c.req.param("reportId");

  const [report] = await db
    .select({
      id: dailyReports.id,
      facilityId: dailyReports.facilityId,
      childId: dailyReports.childId,
      date: dailyReports.date,
    })
    .from(dailyReports)
    .where(eq(dailyReports.id, reportId))
    .limit(1);

  if (!report) throw new Error("Report not found");
  await assertFacilityStaffOrOwner(report.facilityId, userId);

  const [updated] = await db
    .update(dailyReports)
    .set({
      status: "published",
      publishedAt: new Date(),
      publishedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(dailyReports.id, reportId))
    .returning();

  // Notify parent
  const [detail] = await db
    .select({
      childFirstName: children.firstName,
      childLastName: children.lastName,
      parentId: children.parentId,
      facilityName: facilities.name,
    })
    .from(children)
    .innerJoin(facilities, eq(facilities.id, report.facilityId))
    .where(eq(children.id, report.childId))
    .limit(1);

  if (detail) {
    await sendNotification({
      type: "daily_report_published",
      recipientId: detail.parentId,
      data: {
        childName: `${detail.childFirstName} ${detail.childLastName}`,
        facilityName: detail.facilityName,
        date: report.date,
      },
      actionUrl: `/parent/children/${report.childId}/daily-report/${report.date}`,
    });
  }

  return c.json(updated);
});

// POST /bulk-publish - Bulk publish daily reports
app.post("/bulk-publish", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { reportIds, facilityId } = body;

  await assertFacilityStaffOrOwner(facilityId, userId);

  const results = [];
  for (const reportId of reportIds) {
    const [updated] = await db
      .update(dailyReports)
      .set({
        status: "published",
        publishedAt: new Date(),
        publishedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dailyReports.id, reportId),
          eq(dailyReports.facilityId, facilityId)
        )
      )
      .returning();

    if (updated) {
      results.push(updated);

      // Notify parent
      const [detail] = await db
        .select({
          childFirstName: children.firstName,
          childLastName: children.lastName,
          parentId: children.parentId,
          facilityName: facilities.name,
        })
        .from(children)
        .innerJoin(facilities, eq(facilities.id, updated.facilityId))
        .where(eq(children.id, updated.childId))
        .limit(1);

      if (detail) {
        await sendNotification({
          type: "daily_report_published",
          recipientId: detail.parentId,
          data: {
            childName: `${detail.childFirstName} ${detail.childLastName}`,
            facilityName: detail.facilityName,
            date: updated.date,
          },
          actionUrl: `/parent/children/${updated.childId}/daily-report/${updated.date}`,
        });
      }
    }
  }

  return c.json(results);
});

export { app as adminDailyReportsRoutes };
