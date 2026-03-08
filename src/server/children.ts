import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { children, facilities } from "@/db/schema";
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

export const getChildren = createServerFn({ method: "GET" })
  .inputValidator((input: { facilityId: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwner(data.facilityId, request.headers);

    return db
      .select()
      .from(children)
      .where(eq(children.facilityId, data.facilityId))
      .orderBy(children.firstName);
  });

export const getChild = createServerFn({ method: "GET" })
  .inputValidator((input: { childId: string; facilityId: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwner(data.facilityId, request.headers);

    const [child] = await db
      .select()
      .from(children)
      .where(
        and(eq(children.id, data.childId), eq(children.facilityId, data.facilityId))
      )
      .limit(1);

    if (!child) throw new Error("Not found");
    return child;
  });

export const createChild = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      facilityId: string;
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      allergies?: string;
      medicalNotes?: string;
      notes?: string;
    }) => input
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwner(data.facilityId, request.headers);

    const [child] = await db.insert(children).values(data).returning();
    return child;
  });

export const updateChild = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      childId: string;
      facilityId: string;
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string | null;
      allergies?: string | null;
      medicalNotes?: string | null;
      notes?: string | null;
    }) => input
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwner(data.facilityId, request.headers);

    const { childId, facilityId, ...updates } = data;

    const [updated] = await db
      .update(children)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(eq(children.id, childId), eq(children.facilityId, facilityId))
      )
      .returning();

    if (!updated) throw new Error("Not found");
    return updated;
  });

export const updateChildStatus = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      childId: string;
      facilityId: string;
      status: "active" | "withdrawn";
    }) => input
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwner(data.facilityId, request.headers);

    const [updated] = await db
      .update(children)
      .set({ status: data.status, updatedAt: new Date() })
      .where(
        and(
          eq(children.id, data.childId),
          eq(children.facilityId, data.facilityId)
        )
      )
      .returning();

    if (!updated) throw new Error("Not found");
    return updated;
  });
