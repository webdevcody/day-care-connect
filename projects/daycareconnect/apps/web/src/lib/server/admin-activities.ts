import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
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
import {
  createActivityEntrySchema,
  bulkCreateActivityEntrySchema,
  updateActivityEntrySchema,
  deleteActivityEntrySchema,
  getActivityEntriesSchema,
} from "@daycare-hub/shared";
import { assertFacilityStaffOrOwner } from "../facility-auth";
import { sendNotification } from "./notification-service";

export const getActivityEntries = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { facilityId: string; childId?: string; date?: string }) =>
      getActivityEntriesSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityStaffOrOwner(data.facilityId, session.user.id);

    const conditions = [eq(activityEntries.facilityId, data.facilityId)];

    if (data.childId) {
      conditions.push(eq(activityEntries.childId, data.childId));
    }

    if (data.date) {
      const startOfDay = new Date(data.date + "T00:00:00Z");
      const endOfDay = new Date(data.date + "T23:59:59.999Z");
      conditions.push(gte(activityEntries.occurredAt, startOfDay));
      conditions.push(lte(activityEntries.occurredAt, endOfDay));
    }

    return db
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
  });

export const getEnrolledChildren = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityStaffOrOwner(data.facilityId, session.user.id);

    return db
      .select({
        id: children.id,
        firstName: children.firstName,
        lastName: children.lastName,
      })
      .from(enrollments)
      .innerJoin(children, eq(enrollments.childId, children.id))
      .where(
        and(
          eq(enrollments.facilityId, data.facilityId),
          eq(enrollments.status, "active")
        )
      )
      .orderBy(children.firstName);
  });

export const createActivityEntry = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    createActivityEntrySchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityStaffOrOwner(data.facilityId, session.user.id);

    // Verify child is enrolled
    const [enrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.childId, data.childId),
          eq(enrollments.facilityId, data.facilityId),
          eq(enrollments.status, "active")
        )
      )
      .limit(1);

    if (!enrollment) throw new Error("Child is not actively enrolled at this facility");

    const [entry] = await db
      .insert(activityEntries)
      .values({
        childId: data.childId,
        facilityId: data.facilityId,
        staffId: session.user.id,
        type: data.type,
        data: data.data,
        photoUrl: data.photoUrl ?? null,
        occurredAt: new Date(data.occurredAt),
      })
      .returning();

    // Auto-create draft daily report
    const dateStr = new Date(data.occurredAt).toISOString().split("T")[0];
    await db
      .insert(dailyReports)
      .values({
        childId: data.childId,
        facilityId: data.facilityId,
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
          eq(enrollments.facilityId, data.facilityId)
        )
      )
      .innerJoin(facilities, eq(facilities.id, data.facilityId))
      .where(eq(children.id, data.childId))
      .limit(1);

    if (detail) {
      await sendNotification({
        type: "new_activity_update",
        recipientId: detail.parentId,
        data: {
          childName: `${detail.childFirstName} ${detail.childLastName}`,
          facilityName: detail.facilityName,
          activityType: data.type,
        },
        actionUrl: `/parent/children/${data.childId}/activities`,
      });
    }

    return entry;
  });

export const bulkCreateActivityEntries = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    bulkCreateActivityEntrySchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityStaffOrOwner(data.facilityId, session.user.id);

    // Verify all children are enrolled
    const activeEnrollments = await db
      .select({ childId: enrollments.childId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.facilityId, data.facilityId),
          eq(enrollments.status, "active")
        )
      );

    const enrolledChildIds = new Set(activeEnrollments.map((e) => e.childId));
    for (const childId of data.childIds) {
      if (!enrolledChildIds.has(childId)) {
        throw new Error(`Child ${childId} is not actively enrolled`);
      }
    }

    const occurredAt = new Date(data.occurredAt);
    const dateStr = occurredAt.toISOString().split("T")[0];

    const entries = await db
      .insert(activityEntries)
      .values(
        data.childIds.map((childId) => ({
          childId,
          facilityId: data.facilityId,
          staffId: session.user.id,
          type: data.type,
          data: data.data,
          photoUrl: data.photoUrl ?? null,
          occurredAt,
        }))
      )
      .returning();

    // Auto-create draft daily reports
    await db
      .insert(dailyReports)
      .values(
        data.childIds.map((childId) => ({
          childId,
          facilityId: data.facilityId,
          date: dateStr,
        }))
      )
      .onConflictDoNothing();

    return entries;
  });

export const updateActivityEntry = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    updateActivityEntrySchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [entry] = await db
      .select({
        id: activityEntries.id,
        facilityId: activityEntries.facilityId,
      })
      .from(activityEntries)
      .where(eq(activityEntries.id, data.activityId))
      .limit(1);

    if (!entry) throw new Error("Activity entry not found");
    await assertFacilityStaffOrOwner(entry.facilityId, session.user.id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.data !== undefined) updateData.data = data.data;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    if (data.occurredAt !== undefined) updateData.occurredAt = new Date(data.occurredAt);

    const [updated] = await db
      .update(activityEntries)
      .set(updateData)
      .where(eq(activityEntries.id, data.activityId))
      .returning();

    return updated;
  });

export const deleteActivityEntry = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    deleteActivityEntrySchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [entry] = await db
      .select({
        id: activityEntries.id,
        facilityId: activityEntries.facilityId,
      })
      .from(activityEntries)
      .where(eq(activityEntries.id, data.activityId))
      .limit(1);

    if (!entry) throw new Error("Activity entry not found");
    await assertFacilityStaffOrOwner(entry.facilityId, session.user.id);

    await db
      .delete(activityEntries)
      .where(eq(activityEntries.id, data.activityId));

    return { success: true };
  });
