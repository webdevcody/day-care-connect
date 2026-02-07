import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import { db, facilityServices, eq } from "@daycare-hub/db";
import { assertFacilityManager } from "../facility-auth";

export const updateFacilityServices = createServerFn({ method: "POST" })
  .inputValidator((data: { facilityId: string; services: string[] }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    await db.transaction(async (tx) => {
      await tx.delete(facilityServices).where(eq(facilityServices.facilityId, data.facilityId));
      if (data.services.length > 0) {
        await tx.insert(facilityServices).values(
          data.services.map((serviceName) => ({
            facilityId: data.facilityId,
            serviceName,
          }))
        );
      }
    });

    return { success: true };
  });
