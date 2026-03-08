import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { childGuardians, children, guardians, facilities } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function requireFacilityOwnerForChild(
  childId: string,
  headers: Headers
) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new Error("Unauthorized");

  const [child] = await db
    .select()
    .from(children)
    .where(eq(children.id, childId))
    .limit(1);

  if (!child) throw new Error("Child not found");

  const [facility] = await db
    .select()
    .from(facilities)
    .where(eq(facilities.id, child.facilityId))
    .limit(1);

  if (!facility || facility.ownerId !== session.user.id) {
    throw new Error("Not found");
  }

  return { session, child, facility };
}

export const getChildGuardians = createServerFn({ method: "GET" })
  .inputValidator((input: { childId: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwnerForChild(data.childId, request.headers);

    const results = await db
      .select({
        id: childGuardians.id,
        childId: childGuardians.childId,
        guardianId: childGuardians.guardianId,
        relationship: childGuardians.relationship,
        isPrimary: childGuardians.isPrimary,
        createdAt: childGuardians.createdAt,
        guardian: {
          id: guardians.id,
          firstName: guardians.firstName,
          lastName: guardians.lastName,
          phone: guardians.phone,
          email: guardians.email,
        },
      })
      .from(childGuardians)
      .innerJoin(guardians, eq(childGuardians.guardianId, guardians.id))
      .where(eq(childGuardians.childId, data.childId));

    return results;
  });

export const linkGuardian = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      childId: string;
      guardianId: string;
      relationship: string;
      isPrimary?: boolean;
    }) => input
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwnerForChild(data.childId, request.headers);

    const [link] = await db
      .insert(childGuardians)
      .values({
        childId: data.childId,
        guardianId: data.guardianId,
        relationship: data.relationship,
        isPrimary: data.isPrimary ?? false,
      })
      .returning();

    return link;
  });

export const unlinkGuardian = createServerFn({ method: "POST" })
  .inputValidator((input: { childId: string; guardianId: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwnerForChild(data.childId, request.headers);

    await db
      .delete(childGuardians)
      .where(
        and(
          eq(childGuardians.childId, data.childId),
          eq(childGuardians.guardianId, data.guardianId)
        )
      );

    return { success: true };
  });
