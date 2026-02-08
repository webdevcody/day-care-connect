import { Hono } from "hono";
import { db, favorites, facilities, eq, and, sql } from "@daycare-hub/db";

const app = new Hono();

app.get("/", async (c) => {
  const userId = c.get("userId") as string;

  const result = await db
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
    .where(eq(favorites.userId, userId))
    .orderBy(favorites.createdAt);

  return c.json(result);
});

app.post("/toggle", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { facilityId } = body;

  const [existing] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.facilityId, facilityId)))
    .limit(1);

  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id));
    return c.json({ favorited: false });
  }

  await db.insert(favorites).values({ userId, facilityId });
  return c.json({ favorited: true });
});

export { app as favoritesRoutes };
