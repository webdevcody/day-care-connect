import { createFileRoute } from "@tanstack/react-router";
import { db, notifications, eq, and, count } from "@daycare-hub/db";
import { apiHandler, requireApiSession, jsonResponse } from "@/lib/api-helpers";

export const Route = createFileRoute("/api/mobile/notifications/unread-count")({
  server: {
    handlers: {
      GET: apiHandler(async (request) => {
        const session = await requireApiSession(request);

        const [result] = await db
          .select({ value: count() })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, session.user.id),
              eq(notifications.isRead, false),
            ),
          );

        return jsonResponse({ count: result?.value ?? 0 });
      }),
    },
  },
});
