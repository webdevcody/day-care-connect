import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import { db, facilityStaff, users, eq, and } from "@daycare-hub/db";
import { assertFacilityManager, assertFacilityOwner } from "../facility-auth";
import type { StaffRole } from "@daycare-hub/shared";

export const getFacilityStaff = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    return db
      .select({
        id: facilityStaff.id,
        userId: facilityStaff.userId,
        staffRole: facilityStaff.staffRole,
        createdAt: facilityStaff.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(facilityStaff)
      .innerJoin(users, eq(facilityStaff.userId, users.id))
      .where(eq(facilityStaff.facilityId, data.facilityId));
  });

export const addStaffMember = createServerFn({ method: "POST" })
  .inputValidator((data: { facilityId: string; email: string; staffRole: StaffRole }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (!user) {
      throw new Error("User not found with that email");
    }

    const existing = await db
      .select({ id: facilityStaff.id })
      .from(facilityStaff)
      .where(
        and(
          eq(facilityStaff.facilityId, data.facilityId),
          eq(facilityStaff.userId, user.id)
        )
      )
      .limit(1);

    if (existing.length) {
      throw new Error("User is already a staff member at this facility");
    }

    const [staff] = await db
      .insert(facilityStaff)
      .values({
        facilityId: data.facilityId,
        userId: user.id,
        staffRole: data.staffRole,
      })
      .returning();

    return staff;
  });

export const removeStaffMember = createServerFn({ method: "POST" })
  .inputValidator((data: { facilityId: string; staffId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityOwner(data.facilityId, session.user.id);

    await db
      .delete(facilityStaff)
      .where(
        and(
          eq(facilityStaff.id, data.staffId),
          eq(facilityStaff.facilityId, data.facilityId)
        )
      );

    return { success: true };
  });
