import { Hono } from "hono";
import {
  db,
  children,
  enrollments,
  facilities,
  favorites,
  activityEntries,
  dailyReports,
  eq,
  and,
  sql,
  desc,
  inArray,
} from "@daycare-hub/db";

const app = new Hono();

app.get("/", async (c) => {
  const userId = c.get("userId") as string;

  const [childrenResult, activeEnrollments, pendingEnrollments, favoritesResult] =
    await Promise.all([
      db
        .select({
          id: children.id,
          firstName: children.firstName,
          lastName: children.lastName,
          dateOfBirth: children.dateOfBirth,
          gender: children.gender,
        })
        .from(children)
        .where(and(eq(children.parentId, userId), eq(children.isDeleted, false)))
        .orderBy(children.firstName),

      db
        .select({
          id: enrollments.id,
          status: enrollments.status,
          scheduleType: enrollments.scheduleType,
          startDate: enrollments.startDate,
          childFirstName: children.firstName,
          childLastName: children.lastName,
          facilityName: facilities.name,
          facilityId: facilities.id,
        })
        .from(enrollments)
        .innerJoin(children, eq(enrollments.childId, children.id))
        .innerJoin(facilities, eq(enrollments.facilityId, facilities.id))
        .where(
          and(
            eq(children.parentId, userId),
            sql`${enrollments.status} IN ('active', 'approved')`
          )
        ),

      db
        .select({
          id: enrollments.id,
          status: enrollments.status,
          scheduleType: enrollments.scheduleType,
          createdAt: enrollments.createdAt,
          childFirstName: children.firstName,
          childLastName: children.lastName,
          facilityName: facilities.name,
          facilityId: facilities.id,
        })
        .from(enrollments)
        .innerJoin(children, eq(enrollments.childId, children.id))
        .innerJoin(facilities, eq(enrollments.facilityId, facilities.id))
        .where(
          and(eq(children.parentId, userId), eq(enrollments.status, "pending"))
        ),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(favorites)
        .where(eq(favorites.userId, userId)),
    ]);

  const favoritesCount = favoritesResult[0]?.count ?? 0;

  let recentActivities: any[] = [];
  let recentReports: any[] = [];

  if (childrenResult.length > 0) {
    const childIds = childrenResult.map((child) => child.id);

    [recentActivities, recentReports] = await Promise.all([
      db
        .select({
          id: activityEntries.id,
          type: activityEntries.type,
          data: activityEntries.data,
          photoUrl: activityEntries.photoUrl,
          occurredAt: activityEntries.occurredAt,
          childFirstName: children.firstName,
          childLastName: children.lastName,
          facilityName: facilities.name,
          childId: activityEntries.childId,
        })
        .from(activityEntries)
        .innerJoin(children, eq(activityEntries.childId, children.id))
        .innerJoin(facilities, eq(activityEntries.facilityId, facilities.id))
        .where(inArray(activityEntries.childId, childIds))
        .orderBy(desc(activityEntries.occurredAt))
        .limit(5),

      db
        .select({
          id: dailyReports.id,
          date: dailyReports.date,
          childId: dailyReports.childId,
          childFirstName: children.firstName,
          childLastName: children.lastName,
          facilityName: facilities.name,
        })
        .from(dailyReports)
        .innerJoin(children, eq(dailyReports.childId, children.id))
        .innerJoin(facilities, eq(dailyReports.facilityId, facilities.id))
        .where(
          and(
            inArray(dailyReports.childId, childIds),
            eq(dailyReports.status, "published")
          )
        )
        .orderBy(desc(dailyReports.date))
        .limit(5),
    ]);
  }

  return c.json({
    children: childrenResult,
    activeEnrollments,
    pendingEnrollments,
    favoritesCount,
    recentActivities,
    recentReports,
  });
});

export { app as dashboardRoutes };
