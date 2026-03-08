import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { guardians, facilities } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function requireFacilityOwner(facilityId: string, headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new Error("Unauthorized");

  const [facility] = await db
    .select()
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (!facility || facility.ownerId !== session.user.id) {
    throw new Error("Not found");
  }

  return { session, facility };
}

export const getGuardians = createServerFn({ method: "GET" })
  .inputValidator((input: { facilityId: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwner(data.facilityId, request.headers);

    return db
      .select()
      .from(guardians)
      .where(eq(guardians.facilityId, data.facilityId))
      .orderBy(guardians.firstName);
  });

export const getGuardian = createServerFn({ method: "GET" })
  .inputValidator((input: { guardianId: string; facilityId: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwner(data.facilityId, request.headers);

    const [guardian] = await db
      .select()
      .from(guardians)
      .where(
        and(
          eq(guardians.id, data.guardianId),
          eq(guardians.facilityId, data.facilityId)
        )
      )
      .limit(1);

    if (!guardian) throw new Error("Not found");
    return guardian;
  });

export const createGuardian = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      facilityId: string;
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
    }) => input
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwner(data.facilityId, request.headers);

    const [guardian] = await db.insert(guardians).values(data).returning();
    return guardian;
  });

export const updateGuardian = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      guardianId: string;
      facilityId: string;
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      notes?: string | null;
    }) => input
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwner(data.facilityId, request.headers);

    const { guardianId, facilityId, ...updates } = data;

    const [updated] = await db
      .update(guardians)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(guardians.id, guardianId),
          eq(guardians.facilityId, facilityId)
        )
      )
      .returning();

    if (!updated) throw new Error("Not found");
    return updated;
  });

export const archiveGuardian = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { guardianId: string; facilityId: string; isArchived: boolean }) =>
      input
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwner(data.facilityId, request.headers);

    const [updated] = await db
      .update(guardians)
      .set({ isArchived: data.isArchived, updatedAt: new Date() })
      .where(
        and(
          eq(guardians.id, data.guardianId),
          eq(guardians.facilityId, data.facilityId)
        )
      )
      .returning();

    if (!updated) throw new Error("Not found");
    return updated;
  });
