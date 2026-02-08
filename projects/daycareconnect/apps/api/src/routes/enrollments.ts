import { Hono } from "hono";
import {
  db,
  children,
  enrollments,
  enrollmentStatusHistory,
  facilities,
  users,
  eq,
  and,
  sql,
} from "@daycare-hub/db";
import { assertChildOwner, assertEnrollmentOwner } from "../lib/parent-auth";
import { sendNotification } from "../lib/notification-service";

const app = new Hono();

app.get("/", async (c) => {
  const userId = c.get("userId") as string;

  const result = await db
    .select({
      id: enrollments.id,
      status: enrollments.status,
      scheduleType: enrollments.scheduleType,
      startDate: enrollments.startDate,
      endDate: enrollments.endDate,
      notes: enrollments.notes,
      createdAt: enrollments.createdAt,
      childFirstName: children.firstName,
      childLastName: children.lastName,
      childId: enrollments.childId,
      facilityName: facilities.name,
      facilityId: facilities.id,
      facilityCity: facilities.city,
      facilityState: facilities.state,
    })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .innerJoin(facilities, eq(enrollments.facilityId, facilities.id))
    .where(eq(children.parentId, userId))
    .orderBy(enrollments.createdAt);

  return c.json(result);
});

app.get("/:enrollmentId", async (c) => {
  const userId = c.get("userId") as string;
  const enrollmentId = c.req.param("enrollmentId");

  await assertEnrollmentOwner(enrollmentId, userId);

  const [enrollment] = await db
    .select({
      id: enrollments.id,
      status: enrollments.status,
      scheduleType: enrollments.scheduleType,
      startDate: enrollments.startDate,
      endDate: enrollments.endDate,
      notes: enrollments.notes,
      createdAt: enrollments.createdAt,
      updatedAt: enrollments.updatedAt,
      childId: enrollments.childId,
      childFirstName: children.firstName,
      childLastName: children.lastName,
      facilityId: facilities.id,
      facilityName: facilities.name,
      facilityCity: facilities.city,
      facilityState: facilities.state,
    })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .innerJoin(facilities, eq(enrollments.facilityId, facilities.id))
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment) {
    return c.json({ error: "Enrollment not found" }, 404);
  }

  return c.json(enrollment);
});

app.get("/:enrollmentId/history", async (c) => {
  const userId = c.get("userId") as string;
  const enrollmentId = c.req.param("enrollmentId");

  await assertEnrollmentOwner(enrollmentId, userId);

  const history = await db
    .select({
      id: enrollmentStatusHistory.id,
      status: enrollmentStatusHistory.status,
      reason: enrollmentStatusHistory.reason,
      createdAt: enrollmentStatusHistory.createdAt,
      changedByName: users.name,
    })
    .from(enrollmentStatusHistory)
    .innerJoin(users, eq(enrollmentStatusHistory.changedBy, users.id))
    .where(eq(enrollmentStatusHistory.enrollmentId, enrollmentId))
    .orderBy(enrollmentStatusHistory.createdAt);

  return c.json(history);
});

app.post("/", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();

  await assertChildOwner(body.childId, userId);

  // Check for duplicate pending or active enrollments
  const [duplicate] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.childId, body.childId),
        eq(enrollments.facilityId, body.facilityId),
        sql`${enrollments.status} IN ('pending', 'active', 'approved')`
      )
    )
    .limit(1);

  if (duplicate) {
    return c.json(
      { error: "An active or pending enrollment already exists for this child at this facility" },
      400
    );
  }

  const [enrollment] = await db
    .insert(enrollments)
    .values({
      childId: body.childId,
      facilityId: body.facilityId,
      scheduleType: body.scheduleType,
      startDate: body.startDate,
      notes: body.notes,
      status: "pending",
    })
    .returning();

  await db.insert(enrollmentStatusHistory).values({
    enrollmentId: enrollment.id,
    status: "pending",
    changedBy: userId,
    reason: "Enrollment submitted",
  });

  // Notify facility owner
  const [facility] = await db
    .select({ ownerId: facilities.ownerId, name: facilities.name })
    .from(facilities)
    .where(eq(facilities.id, body.facilityId))
    .limit(1);

  if (facility) {
    await sendNotification({
      type: "enrollment_submitted",
      recipientId: facility.ownerId,
      data: {
        enrollmentId: enrollment.id,
        facilityName: facility.name,
      },
      actionUrl: `/admin/enrollments/${enrollment.id}`,
    });
  }

  return c.json(enrollment);
});

app.post("/:enrollmentId/withdraw", async (c) => {
  const userId = c.get("userId") as string;
  const enrollmentId = c.req.param("enrollmentId");

  const enrollmentOwnership = await assertEnrollmentOwner(enrollmentId, userId);

  const [enrollment] = await db
    .select({
      id: enrollments.id,
      status: enrollments.status,
      facilityId: enrollments.facilityId,
    })
    .from(enrollments)
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment) {
    return c.json({ error: "Enrollment not found" }, 404);
  }

  if (enrollment.status === "withdrawn") {
    return c.json({ error: "Enrollment is already withdrawn" }, 400);
  }

  const [updated] = await db
    .update(enrollments)
    .set({
      status: "withdrawn",
      endDate: new Date().toISOString().split("T")[0],
      updatedAt: new Date(),
    })
    .where(eq(enrollments.id, enrollmentId))
    .returning();

  await db.insert(enrollmentStatusHistory).values({
    enrollmentId,
    status: "withdrawn",
    changedBy: userId,
    reason: "Withdrawn by parent",
  });

  // Notify facility owner
  const [facility] = await db
    .select({ ownerId: facilities.ownerId, name: facilities.name })
    .from(facilities)
    .where(eq(facilities.id, enrollment.facilityId))
    .limit(1);

  if (facility) {
    await sendNotification({
      type: "enrollment_withdrawn",
      recipientId: facility.ownerId,
      data: {
        enrollmentId,
        facilityName: facility.name,
      },
      actionUrl: `/admin/enrollments/${enrollmentId}`,
    });
  }

  return c.json(updated);
});

export { app as enrollmentsRoutes };
