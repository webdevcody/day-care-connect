import { Hono } from "hono";
import { db, children, enrollments, eq, and, sql } from "@daycare-hub/db";
import { assertChildOwner } from "../lib/parent-auth";

const app = new Hono();

app.get("/", async (c) => {
  const userId = c.get("userId") as string;

  const result = await db
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
    .where(and(eq(children.parentId, userId), eq(children.isDeleted, false)))
    .orderBy(children.firstName);

  return c.json(result);
});

app.get("/:childId", async (c) => {
  const userId = c.get("userId") as string;
  const childId = c.req.param("childId");

  await assertChildOwner(childId, userId);

  const [child] = await db
    .select()
    .from(children)
    .where(and(eq(children.id, childId), eq(children.isDeleted, false)))
    .limit(1);

  if (!child) {
    return c.json({ error: "Child not found" }, 404);
  }

  const childEnrollments = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.childId, childId));

  return c.json({ ...child, enrollments: childEnrollments });
});

app.post("/", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();

  const [created] = await db
    .insert(children)
    .values({ ...body, parentId: userId })
    .returning();

  return c.json(created);
});

app.put("/:childId", async (c) => {
  const userId = c.get("userId") as string;
  const childId = c.req.param("childId");
  const body = await c.req.json();

  await assertChildOwner(childId, userId);

  const [updated] = await db
    .update(children)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(children.id, childId))
    .returning();

  return c.json(updated);
});

app.delete("/:childId", async (c) => {
  const userId = c.get("userId") as string;
  const childId = c.req.param("childId");

  await assertChildOwner(childId, userId);

  const activeEnrollments = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.childId, childId),
        sql`${enrollments.status} IN ('active', 'approved', 'pending')`
      )
    )
    .limit(1);

  if (activeEnrollments.length > 0) {
    return c.json(
      { error: "Cannot delete child with active or pending enrollments" },
      400
    );
  }

  const [updated] = await db
    .update(children)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(children.id, childId))
    .returning();

  return c.json(updated);
});

export { app as childrenRoutes };
