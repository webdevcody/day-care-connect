import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import { db, facilityHours, eq } from "@daycare-hub/db";
import { assertFacilityManager } from "../facility-auth";
import { facilityHoursEntrySchema } from "@daycare-hub/shared";
import { z } from "zod";

export const updateFacilityHours = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { facilityId: string; hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string }> }) => ({
      facilityId: data.facilityId,
      hours: z.array(facilityHoursEntrySchema).parse(data.hours),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    await db.transaction(async (tx) => {
      await tx.delete(facilityHours).where(eq(facilityHours.facilityId, data.facilityId));
      if (data.hours.length > 0) {
        await tx.insert(facilityHours).values(
          data.hours.map((h) => ({
            facilityId: data.facilityId,
            ...h,
          }))
        );
      }
    });

    return { success: true };
  });
