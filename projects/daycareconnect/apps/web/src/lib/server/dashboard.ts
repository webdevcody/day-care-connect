import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
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
import type { ActivityType } from "@daycare-hub/shared";

export const getDashboardData = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const userId = session.user.id;

    const [myChildren, activeEnrollments, pendingEnrollments, favoritesCount] =
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
          .where(
            and(eq(children.parentId, userId), eq(children.isDeleted, false))
          )
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
          .where(eq(favorites.userId, userId))
          .then((r) => r[0]?.count ?? 0),
      ]);

    // Get recent activities across all children
    const childIds = myChildren.map((c) => c.id);
    let recentActivities: {
      id: string;
      type: ActivityType;
      data: Record<string, unknown> | null;
      photoUrl: string | null;
      occurredAt: Date;
      childFirstName: string;
      childLastName: string;
      facilityName: string;
      childId: string;
    }[] = [];

    if (childIds.length > 0) {
      recentActivities = await db
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
        .limit(5);
    }

    // Get recent published daily reports
    let recentReports: {
      id: string;
      date: string;
      childId: string;
      childFirstName: string;
      childLastName: string;
      facilityName: string;
    }[] = [];

    if (childIds.length > 0) {
      recentReports = await db
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
        .limit(5);
    }

    return {
      children: myChildren,
      activeEnrollments,
      pendingEnrollments,
      favoritesCount,
      recentActivities,
      recentReports,
    };
  }
);
