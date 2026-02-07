import { createFileRoute } from "@tanstack/react-router";
import {
  db,
  children,
  activityEntries,
  facilities,
  eq,
  and,
  desc,
  lt,
} from "@daycare-hub/db";
import {
  apiHandler,
  requireApiSession,
  jsonResponse,
  ApiError,
} from "@/lib/api-helpers";

export const Route = createFileRoute(
  "/api/mobile/children/$childId/activities",
)({
  server: {
    handlers: {
      GET: apiHandler(async (request) => {
        const session = await requireApiSession(request);
        const url = new URL(request.url);
        const segments = url.pathname.split("/");
        const childId = segments[segments.indexOf("children") + 1];
        const cursor = url.searchParams.get("cursor");
        const limit = Math.min(
          parseInt(url.searchParams.get("limit") || "20"),
          50,
        );

        const [child] = await db
          .select({ id: children.id })
          .from(children)
          .where(
            and(
              eq(children.id, childId),
              eq(children.parentId, session.user.id),
            ),
          );

        if (!child) {
          throw new ApiError("Child not found", 404);
        }

        const conditions = [eq(activityEntries.childId, childId)];
        if (cursor) {
          conditions.push(lt(activityEntries.occurredAt, new Date(cursor)));
        }

        const activities = await db
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
            facilityName: facilities.name,
          })
          .from(activityEntries)
          .leftJoin(facilities, eq(activityEntries.facilityId, facilities.id))
          .where(and(...conditions))
          .orderBy(desc(activityEntries.occurredAt))
          .limit(limit + 1);

        const hasMore = activities.length > limit;
        const items = hasMore ? activities.slice(0, limit) : activities;
        const nextCursor = hasMore
          ? items[items.length - 1].occurredAt.toISOString()
          : null;

        return jsonResponse({ activities: items, nextCursor });
      }),
    },
  },
});
