import { createFileRoute } from "@tanstack/react-router";
import { db, children, enrollments, facilities, eq, and } from "@daycare-hub/db";
import {
  apiHandler,
  requireApiSession,
  jsonResponse,
  ApiError,
} from "@/lib/api-helpers";

export const Route = createFileRoute("/api/mobile/children/$childId")({
  server: {
    handlers: {
      GET: apiHandler(async (request) => {
        const session = await requireApiSession(request);
        const url = new URL(request.url);
        const childId = url.pathname.split("/").pop()!;

        const [child] = await db
          .select()
          .from(children)
          .where(
            and(
              eq(children.id, childId),
              eq(children.parentId, session.user.id),
              eq(children.isDeleted, false),
            ),
          );

        if (!child) {
          throw new ApiError("Child not found", 404);
        }

        const childEnrollments = await db
          .select({
            id: enrollments.id,
            status: enrollments.status,
            scheduleType: enrollments.scheduleType,
            startDate: enrollments.startDate,
            endDate: enrollments.endDate,
            facilityName: facilities.name,
            facilityId: facilities.id,
          })
          .from(enrollments)
          .leftJoin(facilities, eq(enrollments.facilityId, facilities.id))
          .where(eq(enrollments.childId, childId));

        return jsonResponse({ child, enrollments: childEnrollments });
      }),
    },
  },
});
