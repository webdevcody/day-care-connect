import { createFileRoute } from "@tanstack/react-router";
import { db, pushSubscriptions, eq, and } from "@daycare-hub/db";
import { apiHandler, requireApiSession, jsonResponse } from "@/lib/api-helpers";

export const Route = createFileRoute("/api/mobile/push/unregister")({
  server: {
    handlers: {
      POST: apiHandler(async (request) => {
        const session = await requireApiSession(request);

        await db
          .delete(pushSubscriptions)
          .where(
            and(
              eq(pushSubscriptions.userId, session.user.id),
              eq(pushSubscriptions.deviceType, "mobile"),
            ),
          );

        return jsonResponse({ success: true });
      }),
    },
  },
});
