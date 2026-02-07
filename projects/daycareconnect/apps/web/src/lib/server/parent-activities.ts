import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import {
  db,
  activityEntries,
  dailyReports,
  children,
  facilities,
  users,
  eq,
  and,
  desc,
  lt,
  gte,
  lte,
  isNotNull,
  or,
} from "@daycare-hub/db";
import {
  getChildActivitiesSchema,
  getChildDailyReportsSchema,
  getChildDailyReportSchema,
  getChildPhotosSchema,
} from "@daycare-hub/shared";
import { assertChildOwner } from "../parent-auth";

export const getChildActivities = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { childId: string; cursor?: string; limit?: number }) =>
      getChildActivitiesSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertChildOwner(data.childId, session.user.id);

    const limit = data.limit ?? 20;
    const conditions = [eq(activityEntries.childId, data.childId)];

    if (data.cursor) {
      conditions.push(lt(activityEntries.occurredAt, new Date(data.cursor)));
    }

    const results = await db
      .select({
        id: activityEntries.id,
        type: activityEntries.type,
        data: activityEntries.data,
        photoUrl: activityEntries.photoUrl,
        occurredAt: activityEntries.occurredAt,
        facilityName: facilities.name,
        staffName: users.name,
      })
      .from(activityEntries)
      .innerJoin(facilities, eq(activityEntries.facilityId, facilities.id))
      .innerJoin(users, eq(activityEntries.staffId, users.id))
      .where(and(...conditions))
      .orderBy(desc(activityEntries.occurredAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    return {
      activities: items,
      nextCursor: hasMore
        ? items[items.length - 1].occurredAt.toISOString()
        : null,
    };
  });

export const getChildDailyReports = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { childId: string; startDate?: string; endDate?: string }) =>
      getChildDailyReportsSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertChildOwner(data.childId, session.user.id);

    const conditions = [
      eq(dailyReports.childId, data.childId),
      eq(dailyReports.status, "published"),
    ];

    if (data.startDate) {
      conditions.push(gte(dailyReports.date, data.startDate));
    }
    if (data.endDate) {
      conditions.push(lte(dailyReports.date, data.endDate));
    }

    return db
      .select({
        id: dailyReports.id,
        date: dailyReports.date,
        summary: dailyReports.summary,
        publishedAt: dailyReports.publishedAt,
        facilityName: facilities.name,
      })
      .from(dailyReports)
      .innerJoin(facilities, eq(dailyReports.facilityId, facilities.id))
      .where(and(...conditions))
      .orderBy(desc(dailyReports.date));
  });

export const getChildDailyReport = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { childId: string; date: string }) =>
      getChildDailyReportSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertChildOwner(data.childId, session.user.id);

    const [report] = await db
      .select({
        id: dailyReports.id,
        date: dailyReports.date,
        summary: dailyReports.summary,
        status: dailyReports.status,
        publishedAt: dailyReports.publishedAt,
        facilityName: facilities.name,
        childFirstName: children.firstName,
        childLastName: children.lastName,
      })
      .from(dailyReports)
      .innerJoin(facilities, eq(dailyReports.facilityId, facilities.id))
      .innerJoin(children, eq(dailyReports.childId, children.id))
      .where(
        and(
          eq(dailyReports.childId, data.childId),
          eq(dailyReports.date, data.date),
          eq(dailyReports.status, "published")
        )
      )
      .limit(1);

    if (!report) throw new Error("Daily report not found");

    // Get all activities for this child on this date
    const startOfDay = new Date(data.date + "T00:00:00Z");
    const endOfDay = new Date(data.date + "T23:59:59.999Z");

    const activities = await db
      .select({
        id: activityEntries.id,
        type: activityEntries.type,
        data: activityEntries.data,
        photoUrl: activityEntries.photoUrl,
        occurredAt: activityEntries.occurredAt,
        staffName: users.name,
      })
      .from(activityEntries)
      .innerJoin(users, eq(activityEntries.staffId, users.id))
      .where(
        and(
          eq(activityEntries.childId, data.childId),
          gte(activityEntries.occurredAt, startOfDay),
          lte(activityEntries.occurredAt, endOfDay)
        )
      )
      .orderBy(activityEntries.occurredAt);

    return { ...report, activities };
  });

export const getChildPhotos = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { childId: string; startDate?: string; endDate?: string }) =>
      getChildPhotosSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertChildOwner(data.childId, session.user.id);

    const conditions = [
      eq(activityEntries.childId, data.childId),
      or(
        eq(activityEntries.type, "photo"),
        isNotNull(activityEntries.photoUrl)
      ),
    ];

    if (data.startDate) {
      conditions.push(gte(activityEntries.occurredAt, new Date(data.startDate + "T00:00:00Z")));
    }
    if (data.endDate) {
      conditions.push(lte(activityEntries.occurredAt, new Date(data.endDate + "T23:59:59.999Z")));
    }

    return db
      .select({
        id: activityEntries.id,
        type: activityEntries.type,
        data: activityEntries.data,
        photoUrl: activityEntries.photoUrl,
        occurredAt: activityEntries.occurredAt,
        facilityName: facilities.name,
      })
      .from(activityEntries)
      .innerJoin(facilities, eq(activityEntries.facilityId, facilities.id))
      .where(and(...conditions))
      .orderBy(desc(activityEntries.occurredAt));
  });
