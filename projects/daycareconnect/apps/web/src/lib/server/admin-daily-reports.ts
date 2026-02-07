import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
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
import {
  getDailyReportsSchema,
  createOrGetDailyReportSchema,
  updateDailyReportSchema,
  publishDailyReportSchema,
} from "@daycare-hub/shared";
import { assertFacilityStaffOrOwner } from "../facility-auth";
import { sendNotification } from "./notification-service";

export const getDailyReports = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { facilityId: string; date?: string; status?: string }) =>
      getDailyReportsSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityStaffOrOwner(data.facilityId, session.user.id);

    const dateFilter = data.date || new Date().toISOString().split("T")[0];

    // Auto-create draft reports for enrolled children that don't have one for this date
    const activeEnrollments = await db
      .select({ childId: enrollments.childId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.facilityId, data.facilityId),
          eq(enrollments.status, "active")
        )
      );

    if (activeEnrollments.length > 0) {
      await db
        .insert(dailyReports)
        .values(
          activeEnrollments.map((e) => ({
            childId: e.childId,
            facilityId: data.facilityId,
            date: dateFilter,
          }))
        )
        .onConflictDoNothing();
    }

    const conditions = [
      eq(dailyReports.facilityId, data.facilityId),
      eq(dailyReports.date, dateFilter),
    ];

    if (data.status) {
      conditions.push(eq(dailyReports.status, data.status as any));
    }

    return db
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
  });

export const createOrGetDailyReport = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    createOrGetDailyReportSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityStaffOrOwner(data.facilityId, session.user.id);

    const [existing] = await db
      .select()
      .from(dailyReports)
      .where(
        and(
          eq(dailyReports.childId, data.childId),
          eq(dailyReports.facilityId, data.facilityId),
          eq(dailyReports.date, data.date)
        )
      )
      .limit(1);

    if (existing) return existing;

    const [report] = await db
      .insert(dailyReports)
      .values({
        childId: data.childId,
        facilityId: data.facilityId,
        date: data.date,
      })
      .returning();

    return report;
  });

export const updateDailyReport = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    updateDailyReportSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [report] = await db
      .select({
        id: dailyReports.id,
        facilityId: dailyReports.facilityId,
        status: dailyReports.status,
      })
      .from(dailyReports)
      .where(eq(dailyReports.id, data.reportId))
      .limit(1);

    if (!report) throw new Error("Report not found");
    await assertFacilityStaffOrOwner(report.facilityId, session.user.id);

    const [updated] = await db
      .update(dailyReports)
      .set({ summary: data.summary, updatedAt: new Date() })
      .where(eq(dailyReports.id, data.reportId))
      .returning();

    return updated;
  });

export const publishDailyReport = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    publishDailyReportSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [report] = await db
      .select({
        id: dailyReports.id,
        facilityId: dailyReports.facilityId,
        childId: dailyReports.childId,
        date: dailyReports.date,
      })
      .from(dailyReports)
      .where(eq(dailyReports.id, data.reportId))
      .limit(1);

    if (!report) throw new Error("Report not found");
    await assertFacilityStaffOrOwner(report.facilityId, session.user.id);

    const [updated] = await db
      .update(dailyReports)
      .set({
        status: "published",
        publishedAt: new Date(),
        publishedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(dailyReports.id, data.reportId))
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

    return updated;
  });

export const bulkPublishDailyReports = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { reportIds: string[]; facilityId: string }) => data
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityStaffOrOwner(data.facilityId, session.user.id);

    const results = [];
    for (const reportId of data.reportIds) {
      const [updated] = await db
        .update(dailyReports)
        .set({
          status: "published",
          publishedAt: new Date(),
          publishedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dailyReports.id, reportId),
            eq(dailyReports.facilityId, data.facilityId)
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

    return results;
  });
