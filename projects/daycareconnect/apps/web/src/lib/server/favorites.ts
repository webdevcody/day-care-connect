import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import {
  db,
  favorites,
  facilities,
  facilityPhotos,
  facilityServices,
  eq,
  and,
  sql,
} from "@daycare-hub/db";

export const toggleFavorite = createServerFn({ method: "POST" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const userId = session.user.id;

    const [existing] = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.facilityId, data.facilityId)))
      .limit(1);

    if (existing) {
      await db.delete(favorites).where(eq(favorites.id, existing.id));
      return { favorited: false };
    }

    await db.insert(favorites).values({
      userId,
      facilityId: data.facilityId,
    });
    return { favorited: true };
  });

export const getMyFavorites = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session) throw new Error("Not authenticated");

  const results = await db
    .select({
      id: facilities.id,
      name: facilities.name,
      city: facilities.city,
      state: facilities.state,
      monthlyRate: facilities.monthlyRate,
      capacity: facilities.capacity,
      ageRangeMin: facilities.ageRangeMin,
      ageRangeMax: facilities.ageRangeMax,
      favoritedAt: favorites.createdAt,
      primaryPhotoUrl: sql<string | null>`(
        SELECT url FROM facility_photos
        WHERE facility_photos.facility_id = ${facilities.id}
        ORDER BY sort_order ASC
        LIMIT 1
      )`,
    })
    .from(favorites)
    .innerJoin(facilities, eq(favorites.facilityId, facilities.id))
    .where(eq(favorites.userId, session.user.id))
    .orderBy(favorites.createdAt);

  return results;
});
