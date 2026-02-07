import { createFileRoute } from "@tanstack/react-router";
import {
  db,
  children,
  dailyReports,
  facilities,
  eq,
  and,
  desc,
} from "@daycare-hub/db";
import {
  apiHandler,
  requireApiSession,
  jsonResponse,
  ApiError,
} from "@/lib/api-helpers";

export const Route = createFileRoute(
  "/api/mobile/children/$childId/daily-reports",
)({
  server: {
    handlers: {
      GET: apiHandler(async (request) => {
        const session = await requireApiSession(request);
        const url = new URL(request.url);
        const segments = url.pathname.split("/");
        const childId = segments[segments.indexOf("children") + 1];
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

        const reports = await db
          .select({
            id: dailyReports.id,
            childId: dailyReports.childId,
            facilityId: dailyReports.facilityId,
            date: dailyReports.date,
            summary: dailyReports.summary,
            status: dailyReports.status,
            publishedAt: dailyReports.publishedAt,
            facilityName: facilities.name,
          })
          .from(dailyReports)
          .leftJoin(facilities, eq(dailyReports.facilityId, facilities.id))
          .where(
            and(
              eq(dailyReports.childId, childId),
              eq(dailyReports.status, "published"),
            ),
          )
          .orderBy(desc(dailyReports.date))
          .limit(limit);

        return jsonResponse({ reports });
      }),
    },
  },
});
