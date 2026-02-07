import { db, facilities, facilityStaff, eq, and } from "@daycare-hub/db";

export async function assertFacilityOwner(facilityId: string, userId: string) {
  const facility = await db
    .select({ id: facilities.id, ownerId: facilities.ownerId })
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (!facility.length) {
    throw new Error("Facility not found");
  }
  if (facility[0].ownerId !== userId) {
    throw new Error("Not authorized: must be facility owner");
  }
  return facility[0];
}

export async function assertFacilityManager(facilityId: string, userId: string) {
  const facility = await db
    .select({ id: facilities.id, ownerId: facilities.ownerId })
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (!facility.length) {
    throw new Error("Facility not found");
  }

  if (facility[0].ownerId === userId) {
    return facility[0];
  }

  const staff = await db
    .select({ id: facilityStaff.id })
    .from(facilityStaff)
    .where(
      and(
        eq(facilityStaff.facilityId, facilityId),
        eq(facilityStaff.userId, userId),
        eq(facilityStaff.staffRole, "director")
      )
    )
    .limit(1);

  if (!staff.length) {
    throw new Error("Not authorized: must be facility owner or director");
  }

  return facility[0];
}

export async function assertFacilityStaffOrOwner(facilityId: string, userId: string) {
  const facility = await db
    .select({ id: facilities.id, ownerId: facilities.ownerId })
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (!facility.length) {
    throw new Error("Facility not found");
  }

  if (facility[0].ownerId === userId) {
    return facility[0];
  }

  const staff = await db
    .select({ id: facilityStaff.id })
    .from(facilityStaff)
    .where(
      and(
        eq(facilityStaff.facilityId, facilityId),
        eq(facilityStaff.userId, userId)
      )
    )
    .limit(1);

  if (!staff.length) {
    throw new Error("Not authorized: must be facility owner or staff member");
  }

  return facility[0];
}
