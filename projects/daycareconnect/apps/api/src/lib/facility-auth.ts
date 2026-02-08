import {
  db,
  facilities,
  facilityStaff,
  facilityStaffPermissions,
  eq,
  and,
} from "@daycare-hub/db";
import type { StaffPermission } from "@daycare-hub/shared";

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

// ─── Fine-Grained Permission Checks ──────────────────────────────────────────

/**
 * Assert that a user has a specific permission for a facility.
 * Facility owners implicitly have ALL permissions.
 * Staff members must have the permission explicitly granted.
 */
export async function assertFacilityPermission(
  facilityId: string,
  userId: string,
  permission: StaffPermission
) {
  const facility = await db
    .select({ id: facilities.id, ownerId: facilities.ownerId })
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (!facility.length) {
    throw new Error("Facility not found");
  }

  // Owners have all permissions implicitly
  if (facility[0].ownerId === userId) {
    return facility[0];
  }

  // Find the staff record
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
    throw new Error("Not authorized: not a staff member of this facility");
  }

  // Check the specific permission
  const perm = await db
    .select({ permission: facilityStaffPermissions.permission })
    .from(facilityStaffPermissions)
    .where(
      and(
        eq(facilityStaffPermissions.facilityStaffId, staff[0].id),
        eq(facilityStaffPermissions.permission, permission)
      )
    )
    .limit(1);

  if (!perm.length) {
    throw new Error(
      `Not authorized: missing permission "${permission}"`
    );
  }

  return facility[0];
}

/**
 * Get all permissions for a staff member at a facility.
 * Returns empty array if user is not staff. Returns null if user is owner (has all).
 */
export async function getStaffPermissions(
  facilityId: string,
  userId: string
): Promise<string[] | null> {
  const facility = await db
    .select({ id: facilities.id, ownerId: facilities.ownerId })
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (!facility.length) {
    return [];
  }

  // Owners have all permissions
  if (facility[0].ownerId === userId) {
    return null; // null = all permissions (owner)
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
    return [];
  }

  const perms = await db
    .select({ permission: facilityStaffPermissions.permission })
    .from(facilityStaffPermissions)
    .where(eq(facilityStaffPermissions.facilityStaffId, staff[0].id));

  return perms.map((p) => p.permission);
}
