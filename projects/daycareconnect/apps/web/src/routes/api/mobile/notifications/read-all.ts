import { createFileRoute } from "@tanstack/react-router";
import { db, notifications, eq, and } from "@daycare-hub/db";
import { apiHandler, requireApiSession, jsonResponse } from "@/lib/api-helpers";

export const Route = createFileRoute("/api/mobile/notifications/read-all")({
  server: {
    handlers: {
      POST: apiHandler(async (request) => {
        const session = await requireApiSession(request);

        await db
          .update(notifications)
          .set({ isRead: true })
          .where(
            and(
              eq(notifications.userId, session.user.id),
              eq(notifications.isRead, false),
            ),
          );

        return jsonResponse({ success: true });
      }),
    },
  },
});
