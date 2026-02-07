import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import { db, children, enrollments, eq, and, sql } from "@daycare-hub/db";
import { createChildSchema, updateChildSchema } from "@daycare-hub/shared";
import { assertChildOwner } from "../parent-auth";

export const getMyChildren = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const results = await db
      .select({
        id: children.id,
        firstName: children.firstName,
        lastName: children.lastName,
        dateOfBirth: children.dateOfBirth,
        gender: children.gender,
        allergies: children.allergies,
        medicalNotes: children.medicalNotes,
        emergencyContactName: children.emergencyContactName,
        emergencyContactPhone: children.emergencyContactPhone,
        createdAt: children.createdAt,
        activeEnrollments: sql<number>`(
          SELECT count(*)::int FROM enrollments
          WHERE enrollments.child_id = ${children.id}
          AND enrollments.status IN ('active', 'approved')
        )`,
        pendingEnrollments: sql<number>`(
          SELECT count(*)::int FROM enrollments
          WHERE enrollments.child_id = ${children.id}
          AND enrollments.status = 'pending'
        )`,
      })
      .from(children)
      .where(
        and(eq(children.parentId, session.user.id), eq(children.isDeleted, false))
      )
      .orderBy(children.firstName);

    return results;
  }
);

export const getChild = createServerFn({ method: "GET" })
  .inputValidator((data: { childId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertChildOwner(data.childId, session.user.id);

    const [child] = await db
      .select()
      .from(children)
      .where(and(eq(children.id, data.childId), eq(children.isDeleted, false)))
      .limit(1);

    if (!child) throw new Error("Child not found");

    const childEnrollments = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.childId, data.childId));

    return { ...child, enrollments: childEnrollments };
  });

export const createChild = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => createChildSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [child] = await db
      .insert(children)
      .values({
        ...data,
        parentId: session.user.id,
      })
      .returning();

    return child;
  });

export const updateChild = createServerFn({ method: "POST" })
  .inputValidator((data: { childId: string } & Record<string, unknown>) => ({
    childId: data.childId,
    ...updateChildSchema.parse(data),
  }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const { childId, ...updateData } = data;
    await assertChildOwner(childId, session.user.id);

    const [updated] = await db
      .update(children)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(children.id, childId))
      .returning();

    return updated;
  });

export const deleteChild = createServerFn({ method: "POST" })
  .inputValidator((data: { childId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertChildOwner(data.childId, session.user.id);

    // Check for active enrollments
    const activeEnrollments = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.childId, data.childId),
          sql`${enrollments.status} IN ('active', 'approved', 'pending')`
        )
      )
      .limit(1);

    if (activeEnrollments.length > 0) {
      throw new Error("Cannot delete child with active or pending enrollments");
    }

    const [updated] = await db
      .update(children)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(children.id, data.childId))
      .returning();

    return updated;
  });
