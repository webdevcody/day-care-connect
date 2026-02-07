import { createFileRoute } from "@tanstack/react-router";
import { db, notifications, eq, and } from "@daycare-hub/db";
import {
  apiHandler,
  requireApiSession,
  jsonResponse,
  ApiError,
} from "@/lib/api-helpers";

export const Route = createFileRoute(
  "/api/mobile/notifications/$notificationId/read",
)({
  server: {
    handlers: {
      POST: apiHandler(async (request) => {
        const session = await requireApiSession(request);
        const url = new URL(request.url);
        const segments = url.pathname.split("/");
        const notificationId =
          segments[segments.indexOf("notifications") + 1];

        const [notification] = await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(
            and(
              eq(notifications.id, notificationId),
              eq(notifications.userId, session.user.id),
            ),
          );

        if (!notification) {
          throw new ApiError("Notification not found", 404);
        }

        await db
          .update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.id, notificationId));

        return jsonResponse({ success: true });
      }),
    },
  },
});
