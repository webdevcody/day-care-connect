import { createFileRoute } from "@tanstack/react-router";
import { db, pushSubscriptions, eq, and } from "@daycare-hub/db";
import {
  apiHandler,
  requireApiSession,
  jsonResponse,
  ApiError,
} from "@/lib/api-helpers";

export const Route = createFileRoute("/api/mobile/push/register")({
  server: {
    handlers: {
      POST: apiHandler(async (request) => {
        const session = await requireApiSession(request);
        const body = await request.json();

        if (!body.token) {
          throw new ApiError("Push token is required", 400);
        }

        const existing = await db
          .select({ id: pushSubscriptions.id })
          .from(pushSubscriptions)
          .where(
            and(
              eq(pushSubscriptions.userId, session.user.id),
              eq(pushSubscriptions.deviceType, "mobile"),
            ),
          );

        if (existing.length > 0) {
          await db
            .update(pushSubscriptions)
            .set({ subscription: { expoPushToken: body.token } })
            .where(eq(pushSubscriptions.id, existing[0].id));
        } else {
          await db.insert(pushSubscriptions).values({
            userId: session.user.id,
            deviceType: "mobile",
            subscription: { expoPushToken: body.token },
          });
        }

        return jsonResponse({ success: true });
      }),
    },
  },
});
