import { Hono } from "hono";
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
import { assertChildOwner } from "../lib/parent-auth";

const app = new Hono();

app.get("/children/:childId", async (c) => {
  const userId = c.get("userId") as string;
  const childId = c.req.param("childId");
  const cursor = c.req.query("cursor");
  const limit = parseInt(c.req.query("limit") || "20", 10);

  await assertChildOwner(childId, userId);

  const conditions: any[] = [eq(activityEntries.childId, childId)];

  if (cursor) {
    conditions.push(lt(activityEntries.occurredAt, new Date(cursor)));
  }

  const result = await db
    .select({
      id: activityEntries.id,
      type: activityEntries.type,
      data: activityEntries.data,
      photoUrl: activityEntries.photoUrl,
      occurredAt: activityEntries.occurredAt,
      createdAt: activityEntries.createdAt,
      facilityName: facilities.name,
      staffName: users.name,
    })
    .from(activityEntries)
    .innerJoin(facilities, eq(activityEntries.facilityId, facilities.id))
    .innerJoin(users, eq(activityEntries.staffId, users.id))
    .where(and(...conditions))
    .orderBy(desc(activityEntries.occurredAt))
    .limit(limit + 1);

  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;
  const nextCursor = hasMore ? items[items.length - 1].occurredAt.toISOString() : null;

  return c.json({ activities: items, nextCursor });
});

app.get("/children/:childId/daily-reports", async (c) => {
  const userId = c.get("userId") as string;
  const childId = c.req.param("childId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  await assertChildOwner(childId, userId);

  const conditions: any[] = [
    eq(dailyReports.childId, childId),
    eq(dailyReports.status, "published"),
  ];

  if (startDate) {
    conditions.push(gte(dailyReports.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(dailyReports.date, endDate));
  }

  const result = await db
    .select({
      id: dailyReports.id,
      date: dailyReports.date,
      summary: dailyReports.summary,
      status: dailyReports.status,
      publishedAt: dailyReports.publishedAt,
      facilityName: facilities.name,
      facilityId: dailyReports.facilityId,
      createdAt: dailyReports.createdAt,
    })
    .from(dailyReports)
    .innerJoin(facilities, eq(dailyReports.facilityId, facilities.id))
    .where(and(...conditions))
    .orderBy(desc(dailyReports.date));

  return c.json(result);
});

app.get("/children/:childId/daily-reports/:date", async (c) => {
  const userId = c.get("userId") as string;
  const childId = c.req.param("childId");
  const date = c.req.param("date");

  await assertChildOwner(childId, userId);

  const [report] = await db
    .select({
      id: dailyReports.id,
      date: dailyReports.date,
      summary: dailyReports.summary,
      status: dailyReports.status,
      publishedAt: dailyReports.publishedAt,
      facilityName: facilities.name,
      facilityId: dailyReports.facilityId,
      createdAt: dailyReports.createdAt,
    })
    .from(dailyReports)
    .innerJoin(facilities, eq(dailyReports.facilityId, facilities.id))
    .where(
      and(
        eq(dailyReports.childId, childId),
        eq(dailyReports.date, date),
        eq(dailyReports.status, "published")
      )
    )
    .limit(1);

  if (!report) {
    return c.json({ error: "Report not found" }, 404);
  }

  // Get activities for the date range (same day)
  const dateStart = new Date(`${date}T00:00:00Z`);
  const dateEnd = new Date(`${date}T23:59:59Z`);

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
        eq(activityEntries.childId, childId),
        gte(activityEntries.occurredAt, dateStart),
        lte(activityEntries.occurredAt, dateEnd)
      )
    )
    .orderBy(desc(activityEntries.occurredAt));

  return c.json({ ...report, activities });
});

app.get("/children/:childId/photos", async (c) => {
  const userId = c.get("userId") as string;
  const childId = c.req.param("childId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  await assertChildOwner(childId, userId);

  const conditions: any[] = [
    eq(activityEntries.childId, childId),
    or(eq(activityEntries.type, "photo"), isNotNull(activityEntries.photoUrl)),
  ];

  if (startDate) {
    conditions.push(gte(activityEntries.occurredAt, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(activityEntries.occurredAt, new Date(endDate)));
  }

  const result = await db
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

  return c.json(result);
});

export { app as activitiesRoutes };
