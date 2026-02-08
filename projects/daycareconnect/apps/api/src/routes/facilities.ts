import { Hono } from "hono";
import {
  db,
  facilities,
  facilityHours,
  facilityPhotos,
  facilityServices,
  facilityStaff,
  facilityStaffPermissions,
  staffInvites,
  users,
  enrollments,
  favorites,
  eq,
  and,
  sql,
  isNotNull,
  isNull,
} from "@daycare-hub/db";
import {
  createFacilitySchema,
  updateFacilitySchema,
  facilityHoursEntrySchema,
  DEFAULT_ROLE_PERMISSIONS,
  STAFF_PERMISSIONS,
} from "@daycare-hub/shared";
import type { StaffRole, StaffPermission } from "@daycare-hub/shared";
import { z } from "zod";
import { randomBytes } from "crypto";
import {
  assertFacilityOwner,
  assertFacilityManager,
  assertFacilityPermission,
} from "../lib/facility-auth";
import { auth } from "../lib/auth";

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
      monthlyRate: data.monthlyRate ?? null,
      hourlyRate: data.hourlyRate ?? null,
      dailyRate: data.dailyRate ?? null,
      weeklyRate: data.weeklyRate ?? null,
      licenseExpiry: data.licenseExpiry || null,
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
// PUT /:facilityId - update facility details (requires facility:edit permission)
app.put("/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "facility:edit");

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

  await assertFacilityPermission(facilityId, userId, "facility:edit");

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

  await assertFacilityPermission(facilityId, userId, "facility:edit");

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

  await assertFacilityPermission(facilityId, userId, "facility:edit");

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

  await assertFacilityPermission(facilityId, userId, "facility:edit");

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

  await assertFacilityPermission(facilityId, userId, "facility:edit");

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
// GET /:facilityId/staff - list staff members with their permissions
app.get("/:facilityId/staff", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "staff:manage");

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

  // Load permissions for all staff members
  const staffIds = staff.map((s) => s.id);
  let permissionsMap: Record<string, string[]> = {};
  if (staffIds.length > 0) {
    const allPerms = await db
      .select({
        facilityStaffId: facilityStaffPermissions.facilityStaffId,
        permission: facilityStaffPermissions.permission,
      })
      .from(facilityStaffPermissions)
      .where(sql`${facilityStaffPermissions.facilityStaffId} IN ${staffIds}`);

    for (const p of allPerms) {
      if (!permissionsMap[p.facilityStaffId]) permissionsMap[p.facilityStaffId] = [];
      permissionsMap[p.facilityStaffId].push(p.permission);
    }
  }

  const staffWithPermissions = staff.map((s) => ({
    ...s,
    permissions: permissionsMap[s.id] || [],
  }));

  return c.json(staffWithPermissions);
});

// POST /:facilityId/staff/create-account - create a new user account and add as staff
app.post("/:facilityId/staff/create-account", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "staff:manage");

  const body = await c.req.json();
  const { email, password, firstName, lastName, staffRole } = body as {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    staffRole: StaffRole;
  };

  if (!email || !password || !firstName || !lastName || !staffRole) {
    return c.json({ error: "All fields are required" }, 400);
  }

  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  // Check if user already exists
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    return c.json({ error: "A user with that email already exists. Use 'Existing User' tab to add them." }, 409);
  }

  // Create user via better-auth server API
  const signUpResult = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      role: "staff",
    },
  });

  if (!signUpResult?.user) {
    return c.json({ error: "Failed to create user account" }, 500);
  }

  const newUserId = signUpResult.user.id;

  // Check if already staff (shouldn't be, but just in case)
  const existing = await db
    .select({ id: facilityStaff.id })
    .from(facilityStaff)
    .where(
      and(
        eq(facilityStaff.facilityId, facilityId),
        eq(facilityStaff.userId, newUserId)
      )
    )
    .limit(1);

  if (existing.length) {
    return c.json({ error: "User is already a staff member at this facility" }, 409);
  }

  // Insert staff member and auto-assign default permissions
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[staffRole] || [];

  const [staff] = await db
    .insert(facilityStaff)
    .values({
      facilityId,
      userId: newUserId,
      staffRole,
    })
    .returning();

  if (defaultPerms.length > 0) {
    await db.insert(facilityStaffPermissions).values(
      defaultPerms.map((permission) => ({
        facilityStaffId: staff.id,
        permission,
      }))
    );
  }

  return c.json({ ...staff, permissions: defaultPerms, email }, 201);
});

// POST /:facilityId/staff/invite - create a staff invite link
app.post("/:facilityId/staff/invite", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "staff:manage");

  const body = await c.req.json();
  const { staffRole } = body as { staffRole: StaffRole };

  if (!staffRole) {
    return c.json({ error: "Staff role is required" }, 400);
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [invite] = await db
    .insert(staffInvites)
    .values({
      facilityId,
      token,
      staffRole,
      createdBy: userId,
      expiresAt,
    })
    .returning();

  const webUrl = process.env.WEB_URL || "http://localhost:3000";
  const inviteUrl = `${webUrl}/staff-invite/${token}`;

  return c.json({ ...invite, inviteUrl }, 201);
});

// GET /:facilityId/staff/invites - list active staff invites
app.get("/:facilityId/staff/invites", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "staff:manage");

  const invites = await db
    .select()
    .from(staffInvites)
    .where(
      and(
        eq(staffInvites.facilityId, facilityId),
        isNull(staffInvites.usedAt)
      )
    );

  const webUrl = process.env.WEB_URL || "http://localhost:3000";
  const invitesWithUrls = invites.map((invite) => ({
    ...invite,
    inviteUrl: `${webUrl}/staff-invite/${invite.token}`,
    isExpired: invite.expiresAt ? new Date(invite.expiresAt) < new Date() : false,
  }));

  return c.json(invitesWithUrls);
});

// POST /:facilityId/staff - add a staff member by email (auto-assigns default permissions)
app.post("/:facilityId/staff", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "staff:manage");

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

  // Insert staff member and auto-assign default permissions for their role
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[staffRole] || [];

  const [staff] = await db
    .insert(facilityStaff)
    .values({
      facilityId,
      userId: user.id,
      staffRole,
    })
    .returning();

  if (defaultPerms.length > 0) {
    await db.insert(facilityStaffPermissions).values(
      defaultPerms.map((permission) => ({
        facilityStaffId: staff.id,
        permission,
      }))
    );
  }

  return c.json({ ...staff, permissions: defaultPerms }, 201);
});

// GET /:facilityId/staff/:staffId/permissions - get permissions for a staff member
app.get("/:facilityId/staff/:staffId/permissions", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const staffId = c.req.param("staffId");

  await assertFacilityPermission(facilityId, userId, "staff:manage");

  const [staffMember] = await db
    .select({
      id: facilityStaff.id,
      staffRole: facilityStaff.staffRole,
      userName: users.name,
      userEmail: users.email,
    })
    .from(facilityStaff)
    .innerJoin(users, eq(facilityStaff.userId, users.id))
    .where(
      and(
        eq(facilityStaff.id, staffId),
        eq(facilityStaff.facilityId, facilityId)
      )
    )
    .limit(1);

  if (!staffMember) {
    return c.json({ error: "Staff member not found" }, 404);
  }

  const perms = await db
    .select({ permission: facilityStaffPermissions.permission })
    .from(facilityStaffPermissions)
    .where(eq(facilityStaffPermissions.facilityStaffId, staffId));

  return c.json({
    ...staffMember,
    permissions: perms.map((p) => p.permission),
    allPermissions: STAFF_PERMISSIONS,
  });
});

// PUT /:facilityId/staff/:staffId/permissions - update permissions for a staff member
app.put("/:facilityId/staff/:staffId/permissions", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const staffId = c.req.param("staffId");

  await assertFacilityPermission(facilityId, userId, "staff:manage");

  const body = await c.req.json();
  const { permissions } = body as { permissions: string[] };

  // Validate all permissions are valid
  const validPermissions = permissions.filter((p) =>
    (STAFF_PERMISSIONS as readonly string[]).includes(p)
  );

  // Verify staff member belongs to this facility
  const [staffMember] = await db
    .select({ id: facilityStaff.id })
    .from(facilityStaff)
    .where(
      and(
        eq(facilityStaff.id, staffId),
        eq(facilityStaff.facilityId, facilityId)
      )
    )
    .limit(1);

  if (!staffMember) {
    return c.json({ error: "Staff member not found" }, 404);
  }

  // Replace all permissions in a transaction
  await db.transaction(async (tx) => {
    await tx
      .delete(facilityStaffPermissions)
      .where(eq(facilityStaffPermissions.facilityStaffId, staffId));

    if (validPermissions.length > 0) {
      await tx.insert(facilityStaffPermissions).values(
        validPermissions.map((permission) => ({
          facilityStaffId: staffId,
          permission,
        }))
      );
    }
  });

  return c.json({ permissions: validPermissions });
});

// DELETE /:facilityId/staff/:staffId - remove a staff member (owner only)
app.delete("/:facilityId/staff/:staffId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const staffId = c.req.param("staffId");

  await assertFacilityOwner(facilityId, userId);

  // Permissions are cascade-deleted via FK constraint
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
