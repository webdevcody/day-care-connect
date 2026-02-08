import { Hono } from "hono";
import {
  db,
  staffInvites,
  facilities,
  facilityStaff,
  facilityStaffPermissions,
  users,
  eq,
  and,
} from "@daycare-hub/db";
import { DEFAULT_ROLE_PERMISSIONS } from "@daycare-hub/shared";
import type { StaffRole } from "@daycare-hub/shared";
import { auth } from "../lib/auth";

const app = new Hono();

// GET /:token - get staff invite info (public, no auth required)
app.get("/:token", async (c) => {
  const token = c.req.param("token");

  const [invite] = await db
    .select({
      id: staffInvites.id,
      staffRole: staffInvites.staffRole,
      expiresAt: staffInvites.expiresAt,
      usedAt: staffInvites.usedAt,
      facilityId: staffInvites.facilityId,
      facilityName: facilities.name,
    })
    .from(staffInvites)
    .innerJoin(facilities, eq(staffInvites.facilityId, facilities.id))
    .where(eq(staffInvites.token, token))
    .limit(1);

  if (!invite) {
    return c.json({ error: "Invite not found" }, 404);
  }

  if (invite.usedAt) {
    return c.json({ error: "This invite has already been used" }, 410);
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return c.json({ error: "This invite has expired" }, 410);
  }

  return c.json({
    facilityName: invite.facilityName,
    staffRole: invite.staffRole,
    expiresAt: invite.expiresAt,
  });
});

// POST /:token/accept - accept a staff invite by signing up (public, no auth required)
app.post("/:token/accept", async (c) => {
  const token = c.req.param("token");

  const [invite] = await db
    .select()
    .from(staffInvites)
    .where(eq(staffInvites.token, token))
    .limit(1);

  if (!invite) {
    return c.json({ error: "Invite not found" }, 404);
  }

  if (invite.usedAt) {
    return c.json({ error: "This invite has already been used" }, 410);
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return c.json({ error: "This invite has expired" }, 410);
  }

  const body = await c.req.json();
  const { email, password, firstName, lastName } = body as {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };

  if (!email || !password || !firstName || !lastName) {
    return c.json({ error: "All fields are required" }, 400);
  }

  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  // Check if user already exists
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let newUserId: string;

  if (existingUser) {
    // User exists - just add them as staff
    newUserId = existingUser.id;
  } else {
    // Create new user via better-auth
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        role: "staff",
      },
    });

    if (!signUpResult?.user) {
      return c.json({ error: "Failed to create user account" }, 500);
    }

    newUserId = signUpResult.user.id;
  }

  // Check if already staff at this facility
  const existingStaff = await db
    .select({ id: facilityStaff.id })
    .from(facilityStaff)
    .where(
      and(
        eq(facilityStaff.facilityId, invite.facilityId),
        eq(facilityStaff.userId, newUserId)
      )
    )
    .limit(1);

  if (existingStaff.length) {
    // Mark invite as used even if already staff
    await db
      .update(staffInvites)
      .set({ usedAt: new Date(), usedByUserId: newUserId })
      .where(eq(staffInvites.id, invite.id));

    return c.json({ error: "You are already a staff member at this facility" }, 409);
  }

  // Add as staff member with default permissions
  const staffRole = invite.staffRole as StaffRole;
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[staffRole] || [];

  const [staff] = await db
    .insert(facilityStaff)
    .values({
      facilityId: invite.facilityId,
      userId: newUserId,
      staffRole,
    })
    .returning();

  if (defaultPerms.length > 0) {
    await db.insert(facilityStaffPermissions).values(
      defaultPerms.map((permission) => ({
        facilityStaffId: staff.id,
        permission,
      }))
    );
  }

  // Mark invite as used
  await db
    .update(staffInvites)
    .set({ usedAt: new Date(), usedByUserId: newUserId })
    .where(eq(staffInvites.id, invite.id));

  return c.json({ success: true, message: "You have been added as staff!" }, 201);
});

export { app as staffInviteRoutes };
