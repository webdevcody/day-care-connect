import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { facilities } from "@/db/schema";
import { eq } from "drizzle-orm";

export const getMyFacilities = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new Error("Unauthorized");

    return db
      .select()
      .from(facilities)
      .where(eq(facilities.ownerId, session.user.id))
      .orderBy(facilities.createdAt);
  }
);

export const getMyFacility = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new Error("Unauthorized");

    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.ownerId, session.user.id))
      .orderBy(facilities.createdAt)
      .limit(1);

    return facility ?? null;
  }
);

export const getFacility = createServerFn({ method: "GET" })
  .inputValidator((input: { facilityId: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new Error("Unauthorized");

    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, data.facilityId))
      .limit(1);

    if (!facility || facility.ownerId !== session.user.id) {
      throw new Error("Not found");
    }

    return facility;
  });

export const createFacility = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      name: string;
      description?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      phone?: string;
      email?: string;
    }) => input
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new Error("Unauthorized");

    const existing = await db
      .select()
      .from(facilities)
      .where(eq(facilities.ownerId, session.user.id))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("You can only have one facility");
    }

    const [facility] = await db
      .insert(facilities)
      .values({
        ...data,
        ownerId: session.user.id,
      })
      .returning();

    return facility;
  });

export const updateFacility = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      facilityId: string;
      name?: string;
      description?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      phone?: string;
      email?: string;
    }) => input
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new Error("Unauthorized");

    const { facilityId, ...updates } = data;

    const [existing] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1);

    if (!existing || existing.ownerId !== session.user.id) {
      throw new Error("Not found");
    }

    const [updated] = await db
      .update(facilities)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(facilities.id, facilityId))
      .returning();

    return updated;
  });
