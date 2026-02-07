import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import { db, facilityPhotos, eq, and } from "@daycare-hub/db";
import { assertFacilityManager } from "../facility-auth";

export const addFacilityPhoto = createServerFn({ method: "POST" })
  .inputValidator((data: { facilityId: string; url: string; altText?: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const existing = await db
      .select({ id: facilityPhotos.id })
      .from(facilityPhotos)
      .where(eq(facilityPhotos.facilityId, data.facilityId));

    if (existing.length >= 20) {
      throw new Error("Maximum of 20 photos allowed");
    }

    const [photo] = await db
      .insert(facilityPhotos)
      .values({
        facilityId: data.facilityId,
        url: data.url,
        altText: data.altText || null,
        sortOrder: existing.length,
      })
      .returning();

    return photo;
  });

export const deleteFacilityPhoto = createServerFn({ method: "POST" })
  .inputValidator((data: { facilityId: string; photoId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    await db
      .delete(facilityPhotos)
      .where(
        and(
          eq(facilityPhotos.id, data.photoId),
          eq(facilityPhotos.facilityId, data.facilityId)
        )
      );

    return { success: true };
  });

export const reorderFacilityPhotos = createServerFn({ method: "POST" })
  .inputValidator((data: { facilityId: string; photoIds: string[] }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    await db.transaction(async (tx) => {
      for (let i = 0; i < data.photoIds.length; i++) {
        await tx
          .update(facilityPhotos)
          .set({ sortOrder: i })
          .where(
            and(
              eq(facilityPhotos.id, data.photoIds[i]),
              eq(facilityPhotos.facilityId, data.facilityId)
            )
          );
      }
    });

    return { success: true };
  });
