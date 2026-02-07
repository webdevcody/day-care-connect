import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import { db, facilities, facilityHours, facilityPhotos, facilityServices, facilityStaff, users, eq } from "@daycare-hub/db";
import { createFacilitySchema, updateFacilitySchema } from "@daycare-hub/shared";
import { assertFacilityManager, assertFacilityOwner } from "../facility-auth";

export const getMyFacilities = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    return db
      .select()
      .from(facilities)
      .where(eq(facilities.ownerId, session.user.id));
  }
);

export const getFacility = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, data.facilityId))
      .limit(1);

    if (!facility) throw new Error("Facility not found");

    const [hours, photos, services, staff] = await Promise.all([
      db.select().from(facilityHours).where(eq(facilityHours.facilityId, data.facilityId)),
      db.select().from(facilityPhotos).where(eq(facilityPhotos.facilityId, data.facilityId)).orderBy(facilityPhotos.sortOrder),
      db.select().from(facilityServices).where(eq(facilityServices.facilityId, data.facilityId)),
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
        .where(eq(facilityStaff.facilityId, data.facilityId)),
    ]);

    return { ...facility, hours, photos, services, staff };
  });

export const getActiveFacilities = createServerFn({ method: "GET" }).handler(
  async () => {
    const result = await db
      .select()
      .from(facilities)
      .where(eq(facilities.isActive, true));

    if (!result.length) return [];

    const allPhotos = await db
      .select()
      .from(facilityPhotos)
      .orderBy(facilityPhotos.sortOrder);

    const allServices = await db.select().from(facilityServices);

    return result.map((facility) => ({
      ...facility,
      photos: allPhotos.filter((p) => p.facilityId === facility.id),
      services: allServices.filter((s) => s.facilityId === facility.id),
    }));
  }
);

export const createFacility = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => createFacilitySchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");
    if ((session.user as any).role !== "admin") throw new Error("Admin only");

    const [facility] = await db
      .insert(facilities)
      .values({
        ...data,
        ownerId: session.user.id,
        email: data.email || null,
        website: data.website || null,
      })
      .returning();

    return facility;
  });

export const updateFacility = createServerFn({ method: "POST" })
  .inputValidator((data: { facilityId: string } & Record<string, unknown>) => ({
    facilityId: data.facilityId,
    ...updateFacilitySchema.parse(data),
  }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const { facilityId, ...updateData } = data;
    await assertFacilityManager(facilityId, session.user.id);

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

    return updated;
  });

export const toggleFacilityStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityOwner(data.facilityId, session.user.id);

    const [facility] = await db
      .select({ isActive: facilities.isActive })
      .from(facilities)
      .where(eq(facilities.id, data.facilityId));

    const [updated] = await db
      .update(facilities)
      .set({ isActive: !facility.isActive, updatedAt: new Date() })
      .where(eq(facilities.id, data.facilityId))
      .returning();

    return updated;
  });
