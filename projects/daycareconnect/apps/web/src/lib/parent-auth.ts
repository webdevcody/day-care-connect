import { db, children, enrollments, eq, and } from "@daycare-hub/db";

export async function assertChildOwner(childId: string, userId: string) {
  const [child] = await db
    .select({ id: children.id, parentId: children.parentId })
    .from(children)
    .where(and(eq(children.id, childId), eq(children.isDeleted, false)))
    .limit(1);

  if (!child) throw new Error("Child not found");
  if (child.parentId !== userId) throw new Error("Not authorized");
  return child;
}

export async function assertEnrollmentOwner(enrollmentId: string, userId: string) {
  const [enrollment] = await db
    .select({
      id: enrollments.id,
      childId: enrollments.childId,
      parentId: children.parentId,
    })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment) throw new Error("Enrollment not found");
  if (enrollment.parentId !== userId) throw new Error("Not authorized");
  return enrollment;
}
