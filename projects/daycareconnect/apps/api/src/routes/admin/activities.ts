import { Hono } from "hono";
import {
  db,
  activityEntries,
  dailyReports,
  enrollments,
  children,
  facilities,
  eq,
  and,
  desc,
  gte,
  lte,
} from "@daycare-hub/db";
import { assertFacilityPermission } from "../../lib/facility-auth";
import { sendNotification } from "../../lib/notification-service";

const app = new Hono();

// GET /:facilityId/:date - Get activity entries for a facility and date
app.get("/:facilityId/:date", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const date = c.req.param("date");
  const childId = c.req.query("childId");

  await assertFacilityPermission(facilityId, userId, "activities:manage");

  const conditions = [eq(activityEntries.facilityId, facilityId)];

  if (childId) {
    conditions.push(eq(activityEntries.childId, childId));
  }

  if (date) {
    const startOfDay = new Date(date + "T00:00:00Z");
    const endOfDay = new Date(date + "T23:59:59.999Z");
    conditions.push(gte(activityEntries.occurredAt, startOfDay));
    conditions.push(lte(activityEntries.occurredAt, endOfDay));
  }

  const results = await db
    .select({
      id: activityEntries.id,
      childId: activityEntries.childId,
      facilityId: activityEntries.facilityId,
      staffId: activityEntries.staffId,
      type: activityEntries.type,
      data: activityEntries.data,
      photoUrl: activityEntries.photoUrl,
      occurredAt: activityEntries.occurredAt,
      createdAt: activityEntries.createdAt,
      childFirstName: children.firstName,
      childLastName: children.lastName,
    })
    .from(activityEntries)
    .innerJoin(children, eq(activityEntries.childId, children.id))
    .where(and(...conditions))
    .orderBy(desc(activityEntries.occurredAt));

  return c.json(results);
});

// GET /:facilityId/children - Get enrolled children for a facility
app.get("/:facilityId/children", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "activities:manage");

  const results = await db
    .select({
      id: children.id,
      firstName: children.firstName,
      lastName: children.lastName,
    })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .where(
      and(
        eq(enrollments.facilityId, facilityId),
        eq(enrollments.status, "active")
      )
    )
    .orderBy(children.firstName);

  return c.json(results);
});

// POST / - Create a single activity entry
app.post("/", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { facilityId, childId, type, data, photoUrl, occurredAt } = body;

  await assertFacilityPermission(facilityId, userId, "activities:manage");

  // Verify child is enrolled
  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.childId, childId),
        eq(enrollments.facilityId, facilityId),
        eq(enrollments.status, "active")
      )
    )
    .limit(1);

  if (!enrollment) throw new Error("Child is not actively enrolled at this facility");

  const [entry] = await db
    .insert(activityEntries)
    .values({
      childId,
      facilityId,
      staffId: userId,
      type,
      data,
      photoUrl: photoUrl ?? null,
      occurredAt: new Date(occurredAt),
    })
    .returning();

  // Auto-create draft daily report
  const dateStr = new Date(occurredAt).toISOString().split("T")[0];
  await db
    .insert(dailyReports)
    .values({
      childId,
      facilityId,
      date: dateStr,
    })
    .onConflictDoNothing();

  // Notify parent
  const [detail] = await db
    .select({
      childFirstName: children.firstName,
      childLastName: children.lastName,
      parentId: children.parentId,
      facilityName: facilities.name,
    })
    .from(children)
    .innerJoin(
      enrollments,
      and(
        eq(enrollments.childId, children.id),
        eq(enrollments.facilityId, facilityId)
      )
    )
    .innerJoin(facilities, eq(facilities.id, facilityId))
    .where(eq(children.id, childId))
    .limit(1);

  if (detail) {
    await sendNotification({
      type: "new_activity_update",
      recipientId: detail.parentId,
      data: {
        childName: `${detail.childFirstName} ${detail.childLastName}`,
        facilityName: detail.facilityName,
        activityType: type,
      },
      actionUrl: `/parent/children/${childId}/activities`,
    });
  }

  return c.json(entry);
});

// POST /bulk - Bulk create activity entries
app.post("/bulk", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { facilityId, childIds, type, data, photoUrl, occurredAt } = body;

  await assertFacilityPermission(facilityId, userId, "activities:manage");

  // Verify all children are enrolled
  const activeEnrollments = await db
    .select({ childId: enrollments.childId })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.facilityId, facilityId),
        eq(enrollments.status, "active")
      )
    );

  const enrolledChildIds = new Set(activeEnrollments.map((e) => e.childId));
  for (const childId of childIds) {
    if (!enrolledChildIds.has(childId)) {
      throw new Error(`Child ${childId} is not actively enrolled`);
    }
  }

  const occurredAtDate = new Date(occurredAt);
  const dateStr = occurredAtDate.toISOString().split("T")[0];

  const entries = await db
    .insert(activityEntries)
    .values(
      childIds.map((childId: string) => ({
        childId,
        facilityId,
        staffId: userId,
        type,
        data,
        photoUrl: photoUrl ?? null,
        occurredAt: occurredAtDate,
      }))
    )
    .returning();

  // Auto-create draft daily reports
  await db
    .insert(dailyReports)
    .values(
      childIds.map((childId: string) => ({
        childId,
        facilityId,
        date: dateStr,
      }))
    )
    .onConflictDoNothing();

  return c.json(entries);
});

// PUT /:activityId - Update an activity entry
app.put("/:activityId", async (c) => {
  const userId = c.get("userId") as string;
  const activityId = c.req.param("activityId");
  const body = await c.req.json();

  const [entry] = await db
    .select({
      id: activityEntries.id,
      facilityId: activityEntries.facilityId,
    })
    .from(activityEntries)
    .where(eq(activityEntries.id, activityId))
    .limit(1);

  if (!entry) throw new Error("Activity entry not found");
  await assertFacilityPermission(entry.facilityId, userId, "activities:manage");

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.data !== undefined) updateData.data = body.data;
  if (body.photoUrl !== undefined) updateData.photoUrl = body.photoUrl;
  if (body.occurredAt !== undefined) updateData.occurredAt = new Date(body.occurredAt);

  const [updated] = await db
    .update(activityEntries)
    .set(updateData)
    .where(eq(activityEntries.id, activityId))
    .returning();

  return c.json(updated);
});

// DELETE /:activityId - Delete an activity entry
app.delete("/:activityId", async (c) => {
  const userId = c.get("userId") as string;
  const activityId = c.req.param("activityId");

  const [entry] = await db
    .select({
      id: activityEntries.id,
      facilityId: activityEntries.facilityId,
    })
    .from(activityEntries)
    .where(eq(activityEntries.id, activityId))
    .limit(1);

  if (!entry) throw new Error("Activity entry not found");
  await assertFacilityPermission(entry.facilityId, userId, "activities:manage");

  await db
    .delete(activityEntries)
    .where(eq(activityEntries.id, activityId));

  return c.json({ success: true });
});

export { app as adminActivitiesRoutes };
