import { createFileRoute } from "@tanstack/react-router";
import {
  db,
  children,
  enrollments,
  activityEntries,
  facilities,
  eq,
  and,
  desc,
  count,
  inArray,
} from "@daycare-hub/db";
import { apiHandler, requireApiSession, jsonResponse } from "@/lib/api-helpers";

export const Route = createFileRoute("/api/mobile/dashboard")({
  server: {
    handlers: {
      GET: apiHandler(async (request) => {
        const session = await requireApiSession(request);
        const userId = session.user.id;

        const userChildren = await db
          .select()
          .from(children)
          .where(and(eq(children.parentId, userId), eq(children.isDeleted, false)));

        const childIds = userChildren.map((c) => c.id);

        let activeEnrollments: { value: number }[] = [{ value: 0 }];
        let recentActivities: (typeof activityEntries.$inferSelect & { facilityName: string | null })[] = [];

        if (childIds.length > 0) {
          activeEnrollments = await db
            .select({ value: count() })
            .from(enrollments)
            .where(
              and(
                inArray(enrollments.childId, childIds),
                eq(enrollments.status, "active"),
              ),
            );

          recentActivities = await db
            .select({
              id: activityEntries.id,
              childId: activityEntries.childId,
              facilityId: activityEntries.facilityId,
              staffId: activityEntries.staffId,
              type: activityEntries.type,
              data: activityEntries.data,
              photoUrl: activityEntries.photoUrl,
              occurredAt: activityEntries.occurredAt,
              createdAt: activityEntries.createdAt,
              updatedAt: activityEntries.updatedAt,
              facilityName: facilities.name,
            })
            .from(activityEntries)
            .leftJoin(facilities, eq(activityEntries.facilityId, facilities.id))
            .where(inArray(activityEntries.childId, childIds))
            .orderBy(desc(activityEntries.occurredAt))
            .limit(10);
        }

        return jsonResponse({
          children: userChildren,
          stats: {
            totalChildren: userChildren.length,
            activeEnrollments: activeEnrollments[0]?.value ?? 0,
          },
          recentActivities,
        });
      }),
    },
  },
});
