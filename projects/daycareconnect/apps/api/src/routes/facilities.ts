import { Hono } from "hono";
import {
  db,
  facilities,
  facilityHours,
  facilityPhotos,
  facilityServices,
  facilityStaff,
  users,
  enrollments,
  favorites,
  eq,
  and,
  sql,
  isNotNull,
} from "@daycare-hub/db";
import {
  createFacilitySchema,
  updateFacilitySchema,
  facilityHoursEntrySchema,
} from "@daycare-hub/shared";
import type { StaffRole } from "@daycare-hub/shared";
import { z } from "zod";
import {
  assertFacilityOwner,
  assertFacilityManager,
} from "../lib/facility-auth";

const app = new Hono();

// ─── Discovery: Search Facilities ────────────────────────────────────────────
// GET /search - Haversine distance search with filters and pagination
app.get("/search", async (c) => {
  const userId = (c.get("userId") as string) || null;

  const lat = parseFloat(c.req.query("lat") || "");
  const lng = parseFloat(c.req.query("lng") || "");
  const radius = parseFloat(c.req.query("radius") || "25");
  const age = c.req.query("age") ? parseInt(c.req.query("age")!) : undefined;
  const maxPrice = c.req.query("maxPrice")
    ? parseFloat(c.req.query("maxPrice")!)
    : undefined;
  const servicesParam = c.req.query("services");
  const services = servicesParam ? servicesParam.split(",") : undefined;
  const available = c.req.query("available") === "true" ? true : undefined;
  const openBefore = c.req.query("openBefore") || undefined;
  const minRating = c.req.query("minRating")
    ? parseFloat(c.req.query("minRating")!)
    : undefined;
  const sort = (c.req.query("sort") as string) || "distance";
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "12");

  if (isNaN(lat) || isNaN(lng)) {
    return c.json({ error: "lat and lng are required" }, 400);
  }

  const offset = (page - 1) * limit;

  // Haversine distance in miles
  const distanceSql = sql<number>`(
    3959 * acos(
      cos(radians(${lat}))
      * cos(radians(CAST(${facilities.latitude} AS double precision)))
      * cos(radians(CAST(${facilities.longitude} AS double precision)) - radians(${lng}))
      + sin(radians(${lat}))
      * sin(radians(CAST(${facilities.latitude} AS double precision)))
    )
  )`;

  // Available spots subquery
  const availableSpotsSql = sql<number>`(
    ${facilities.capacity} - COALESCE((
      SELECT COUNT(*)::int FROM enrollments
      WHERE enrollments.facility_id = ${facilities.id}
      AND enrollments.status = 'active'
    ), 0)
  )`;

  // Is favorited subquery
  const isFavoritedSql = userId
    ? sql<boolean>`EXISTS(
        SELECT 1 FROM favorites
        WHERE favorites.facility_id = ${facilities.id}
        AND favorites.user_id = ${userId}
      )`
    : sql<boolean>`false`;

  // Primary photo subquery
  const primaryPhotoSql = sql<string | null>`(
    SELECT url FROM facility_photos
    WHERE facility_photos.facility_id = ${facilities.id}
    ORDER BY sort_order ASC
    LIMIT 1
  )`;

  // Build WHERE conditions
  const conditions = [
    eq(facilities.isActive, true),
    isNotNull(facilities.latitude),
    isNotNull(facilities.longitude),
    sql`${distanceSql} <= ${radius}`,
  ];

  if (age !== undefined) {
    conditions.push(sql`${facilities.ageRangeMin} <= ${age}`);
    conditions.push(sql`${facilities.ageRangeMax} >= ${age}`);
  }

  if (maxPrice !== undefined) {
    conditions.push(
      sql`CAST(${facilities.monthlyRate} AS numeric) <= ${maxPrice}`
    );
  }

  if (services && services.length > 0) {
    for (const service of services) {
      conditions.push(
        sql`EXISTS(
          SELECT 1 FROM facility_services
          WHERE facility_services.facility_id = ${facilities.id}
          AND facility_services.service_name = ${service}
        )`
      );
    }
  }

  if (available) {
    conditions.push(sql`${availableSpotsSql} > 0`);
  }

  if (openBefore) {
    conditions.push(
      sql`EXISTS(
        SELECT 1 FROM facility_hours
        WHERE facility_hours.facility_id = ${facilities.id}
        AND facility_hours.open_time <= ${openBefore}::time
      )`
    );
  }

  if (minRating !== undefined) {
    conditions.push(
      sql`CAST(${facilities.ratingAverage} AS numeric) >= ${minRating}`
    );
  }

  const whereClause = and(...conditions);

  // Order by
  let orderBy;
  switch (sort) {
    case "price_asc":
      orderBy = sql`CAST(${facilities.monthlyRate} AS numeric) ASC NULLS LAST`;
      break;
    case "price_desc":
      orderBy = sql`CAST(${facilities.monthlyRate} AS numeric) DESC NULLS LAST`;
      break;
    case "rating_desc":
      orderBy = sql`CAST(${facilities.ratingAverage} AS numeric) DESC NULLS LAST`;
      break;
    default:
      orderBy = sql`${distanceSql} ASC`;
  }

  // Get total count
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(facilities)
    .where(whereClause);

  // Get paginated results
  const results = await db
    .select({
      id: facilities.id,
      name: facilities.name,
      address: facilities.address,
      city: facilities.city,
      state: facilities.state,
      zipCode: facilities.zipCode,
      latitude: facilities.latitude,
      longitude: facilities.longitude,
      capacity: facilities.capacity,
      ageRangeMin: facilities.ageRangeMin,
      ageRangeMax: facilities.ageRangeMax,
      monthlyRate: facilities.monthlyRate,
      ratingAverage: facilities.ratingAverage,
      reviewCount: facilities.reviewCount,
      distance: distanceSql.as("distance"),
      availableSpots: availableSpotsSql.as("available_spots"),
      isFavorited: isFavoritedSql.as("is_favorited"),
      primaryPhotoUrl: primaryPhotoSql.as("primary_photo_url"),
    })
    .from(facilities)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  // Batch-load services for result set
  const facilityIds = results.map((r) => r.id);
  let servicesMap: Record<string, string[]> = {};
  if (facilityIds.length > 0) {
    const allServices = await db
      .select({
        facilityId: facilityServices.facilityId,
        serviceName: facilityServices.serviceName,
      })
      .from(facilityServices)
      .where(sql`${facilityServices.facilityId} IN ${facilityIds}`);

    for (const s of allServices) {
      if (!servicesMap[s.facilityId]) servicesMap[s.facilityId] = [];
      servicesMap[s.facilityId].push(s.serviceName);
    }
  }

  const facilitiesWithServices = results.map((f) => ({
    ...f,
    services: servicesMap[f.id] || [],
  }));

  return c.json({
    facilities: facilitiesWithServices,
    totalCount: total,
    hasMore: offset + limit < total,
  });
});

// ─── My Facilities ───────────────────────────────────────────────────────────
// GET /mine - list facilities owned by the current user
app.get("/mine", async (c) => {
  const userId = c.get("userId") as string;

  const result = await db
    .select()
    .from(facilities)
    .where(eq(facilities.ownerId, userId));

  return c.json(result);
});

// ─── Active Facilities (for parents browsing) ───────────────────────────────
// GET / - get all active facilities with photos and services
app.get("/", async (c) => {
  const result = await db
    .select()
    .from(facilities)
    .where(eq(facilities.isActive, true));

  if (!result.length) return c.json([]);

  const allPhotos = await db
    .select()
    .from(facilityPhotos)
    .orderBy(facilityPhotos.sortOrder);

  const allServices = await db.select().from(facilityServices);

  const facilitiesWithRelations = result.map((facility) => ({
    ...facility,
    photos: allPhotos.filter((p) => p.facilityId === facility.id),
    services: allServices.filter((s) => s.facilityId === facility.id),
  }));

  return c.json(facilitiesWithRelations);
});

// ─── Create Facility ─────────────────────────────────────────────────────────
// POST / - create a new facility
app.post("/", async (c) => {
  const userId = c.get("userId") as string;
  const user = c.get("user") as any;

  if (user.role !== "admin") {
    return c.json({ error: "Admin only" }, 403);
  }

  const body = await c.req.json();
  const data = createFacilitySchema.parse(body);

  const [facility] = await db
    .insert(facilities)
    .values({
      ...data,
      ownerId: userId,
      email: data.email || null,
      website: data.website || null,
    })
    .returning();

  return c.json(facility, 201);
});

// ─── Get Facility ────────────────────────────────────────────────────────────
// GET /:facilityId - get a single facility with hours, photos, services, staff
app.get("/:facilityId", async (c) => {
  const facilityId = c.req.param("facilityId");

  const [facility] = await db
    .select()
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (!facility) {
    return c.json({ error: "Facility not found" }, 404);
  }

  const [hours, photos, services, staff] = await Promise.all([
    db
      .select()
      .from(facilityHours)
      .where(eq(facilityHours.facilityId, facilityId)),
    db
      .select()
      .from(facilityPhotos)
      .where(eq(facilityPhotos.facilityId, facilityId))
      .orderBy(facilityPhotos.sortOrder),
    db
      .select()
      .from(facilityServices)
      .where(eq(facilityServices.facilityId, facilityId)),
    db
      .select({
        id: facilityStaff.id,
        userId: facilityStaff.userId,
        staffRole: facilityStaff.staffRole,
        userName: users.name,
        userEmail: users.email,
      })
      .from(facilityStaff)
      .innerJoin(users, eq(facilityStaff.userId, users.id))
      .where(eq(facilityStaff.facilityId, facilityId)),
  ]);

  return c.json({ ...facility, hours, photos, services, staff });
});

// ─── Update Facility ─────────────────────────────────────────────────────────
// PUT /:facilityId - update facility details (owner or director)
app.put("/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityManager(facilityId, userId);

  const body = await c.req.json();
  const updateData = updateFacilitySchema.parse(body);

  const [updated] = await db
    .update(facilities)
    .set({
      ...updateData,
      email: updateData.email || null,
      website: updateData.website || null,
      updatedAt: new Date(),
    })
    .where(eq(facilities.id, facilityId))
    .returning();

  return c.json(updated);
});

// ─── Toggle Facility Status ──────────────────────────────────────────────────
// POST /:facilityId/toggle-status - toggle isActive (owner only)
app.post("/:facilityId/toggle-status", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityOwner(facilityId, userId);

  const [facility] = await db
    .select({ isActive: facilities.isActive })
    .from(facilities)
    .where(eq(facilities.id, facilityId));

  const [updated] = await db
    .update(facilities)
    .set({ isActive: !facility.isActive, updatedAt: new Date() })
    .where(eq(facilities.id, facilityId))
    .returning();

  return c.json(updated);
});

// ─── Facility Hours ──────────────────────────────────────────────────────────
// PUT /:facilityId/hours - replace all hours for a facility
app.put("/:facilityId/hours", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityManager(facilityId, userId);

  const body = await c.req.json();
  const hours = z.array(facilityHoursEntrySchema).parse(body.hours);

  await db.transaction(async (tx) => {
    await tx
      .delete(facilityHours)
      .where(eq(facilityHours.facilityId, facilityId));
    if (hours.length > 0) {
      await tx.insert(facilityHours).values(
        hours.map((h) => ({
          facilityId,
          ...h,
        }))
      );
    }
  });

  return c.json({ success: true });
});

// ─── Facility Photos ─────────────────────────────────────────────────────────
// POST /:facilityId/photos - add a photo (max 20)
app.post("/:facilityId/photos", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityManager(facilityId, userId);

  const body = await c.req.json();
  const { url, altText } = body;

  const existing = await db
    .select({ id: facilityPhotos.id })
    .from(facilityPhotos)
    .where(eq(facilityPhotos.facilityId, facilityId));

  if (existing.length >= 20) {
    return c.json({ error: "Maximum of 20 photos allowed" }, 400);
  }

  const [photo] = await db
    .insert(facilityPhotos)
    .values({
      facilityId,
      url,
      altText: altText || null,
      sortOrder: existing.length,
    })
    .returning();

  return c.json(photo, 201);
});

// DELETE /:facilityId/photos/:photoId - delete a photo
app.delete("/:facilityId/photos/:photoId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const photoId = c.req.param("photoId");

  await assertFacilityManager(facilityId, userId);

  await db
    .delete(facilityPhotos)
    .where(
      and(
        eq(facilityPhotos.id, photoId),
        eq(facilityPhotos.facilityId, facilityId)
      )
    );

  return c.json({ success: true });
});

// PUT /:facilityId/photos/reorder - reorder photos
app.put("/:facilityId/photos/reorder", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityManager(facilityId, userId);

  const body = await c.req.json();
  const { photoIds } = body as { photoIds: string[] };

  await db.transaction(async (tx) => {
    for (let i = 0; i < photoIds.length; i++) {
      await tx
        .update(facilityPhotos)
        .set({ sortOrder: i })
        .where(
          and(
            eq(facilityPhotos.id, photoIds[i]),
            eq(facilityPhotos.facilityId, facilityId)
          )
        );
    }
  });

  return c.json({ success: true });
});

// ─── Facility Services ───────────────────────────────────────────────────────
// PUT /:facilityId/services - replace all services for a facility
app.put("/:facilityId/services", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityManager(facilityId, userId);

  const body = await c.req.json();
  const { services } = body as { services: string[] };

  await db.transaction(async (tx) => {
    await tx
      .delete(facilityServices)
      .where(eq(facilityServices.facilityId, facilityId));
    if (services.length > 0) {
      await tx.insert(facilityServices).values(
        services.map((serviceName) => ({
          facilityId,
          serviceName,
        }))
      );
    }
  });

  return c.json({ success: true });
});

// ─── Facility Staff ──────────────────────────────────────────────────────────
// GET /:facilityId/staff - list staff members
app.get("/:facilityId/staff", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityManager(facilityId, userId);

  const staff = await db
    .select({
      id: facilityStaff.id,
      userId: facilityStaff.userId,
      staffRole: facilityStaff.staffRole,
      createdAt: facilityStaff.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(facilityStaff)
    .innerJoin(users, eq(facilityStaff.userId, users.id))
    .where(eq(facilityStaff.facilityId, facilityId));

  return c.json(staff);
});

// POST /:facilityId/staff - add a staff member by email
app.post("/:facilityId/staff", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityManager(facilityId, userId);

  const body = await c.req.json();
  const { email, staffRole } = body as { email: string; staffRole: StaffRole };

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return c.json({ error: "User not found with that email" }, 404);
  }

  const existing = await db
    .select({ id: facilityStaff.id })
    .from(facilityStaff)
    .where(
      and(
        eq(facilityStaff.facilityId, facilityId),
        eq(facilityStaff.userId, user.id)
      )
    )
    .limit(1);

  if (existing.length) {
    return c.json(
      { error: "User is already a staff member at this facility" },
      409
    );
  }

  const [staff] = await db
    .insert(facilityStaff)
    .values({
      facilityId,
      userId: user.id,
      staffRole,
    })
    .returning();

  return c.json(staff, 201);
});

// DELETE /:facilityId/staff/:staffId - remove a staff member (owner only)
app.delete("/:facilityId/staff/:staffId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const staffId = c.req.param("staffId");

  await assertFacilityOwner(facilityId, userId);

  await db
    .delete(facilityStaff)
    .where(
      and(
        eq(facilityStaff.id, staffId),
        eq(facilityStaff.facilityId, facilityId)
      )
    );

  return c.json({ success: true });
});

export { app as facilitiesRoutes };
