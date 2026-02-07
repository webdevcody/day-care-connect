import { createFileRoute } from "@tanstack/react-router";
import { db, children, eq, and } from "@daycare-hub/db";
import { apiHandler, requireApiSession, jsonResponse } from "@/lib/api-helpers";

export const Route = createFileRoute("/api/mobile/children/")({
  server: {
    handlers: {
      GET: apiHandler(async (request) => {
        const session = await requireApiSession(request);

        const userChildren = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.parentId, session.user.id),
              eq(children.isDeleted, false),
            ),
          );

        return jsonResponse({ children: userChildren });
      }),
    },
  },
});
