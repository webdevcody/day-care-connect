import { createFileRoute } from "@tanstack/react-router";
import { db, notifications, eq, and, desc, lt } from "@daycare-hub/db";
import { apiHandler, requireApiSession, jsonResponse } from "@/lib/api-helpers";

export const Route = createFileRoute("/api/mobile/notifications/")({
  server: {
    handlers: {
      GET: apiHandler(async (request) => {
        const session = await requireApiSession(request);
        const url = new URL(request.url);
        const cursor = url.searchParams.get("cursor");
        const limit = Math.min(
          parseInt(url.searchParams.get("limit") || "20"),
          50,
        );

        const conditions = [eq(notifications.userId, session.user.id)];
        if (cursor) {
          conditions.push(lt(notifications.createdAt, new Date(cursor)));
        }

        const items = await db
          .select()
          .from(notifications)
          .where(and(...conditions))
          .orderBy(desc(notifications.createdAt))
          .limit(limit + 1);

        const hasMore = items.length > limit;
        const data = hasMore ? items.slice(0, limit) : items;
        const nextCursor = hasMore
          ? data[data.length - 1].createdAt.toISOString()
          : null;

        return jsonResponse({ notifications: data, nextCursor });
      }),
    },
  },
});
