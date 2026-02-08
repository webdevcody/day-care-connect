import { Hono } from "hono";
import { randomBytes } from "crypto";
import {
  db,
  facilityInvites,
  inviteSubmissions,
  documentTemplates,
  users,
  children,
  eq,
  and,
  desc,
  asc,
} from "@daycare-hub/db";
import { assertFacilityPermission } from "../../lib/facility-auth";

const app = new Hono();

function generateInviteCode(): string {
  return randomBytes(4).toString("hex");
}

// GET /:facilityId - List invites for facility
app.get("/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "invites:manage");

  const invites = await db
    .select()
    .from(facilityInvites)
    .where(eq(facilityInvites.facilityId, facilityId))
    .orderBy(desc(facilityInvites.createdAt));

  // Get submission counts for each invite
  const result = await Promise.all(
    invites.map(async (invite) => {
      const submissions = await db
        .select({ id: inviteSubmissions.id })
        .from(inviteSubmissions)
        .where(eq(inviteSubmissions.inviteId, invite.id));

      return {
        ...invite,
        submissionCount: submissions.length,
      };
    })
  );

  return c.json(result);
});

// POST /:facilityId - Create invite
app.post("/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const body = await c.req.json();

  await assertFacilityPermission(facilityId, userId, "invites:manage");

  const [invite] = await db
    .insert(facilityInvites)
    .values({
      facilityId,
      code: generateInviteCode(),
      name: body.name || null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning();

  return c.json(invite);
});

// PUT /:inviteId - Update invite
app.put("/:inviteId", async (c) => {
  const userId = c.get("userId") as string;
  const inviteId = c.req.param("inviteId");
  const body = await c.req.json();

  const [invite] = await db
    .select()
    .from(facilityInvites)
    .where(eq(facilityInvites.id, inviteId))
    .limit(1);

  if (!invite) return c.json({ error: "Invite not found" }, 404);
  await assertFacilityPermission(invite.facilityId, userId, "invites:manage");

  const [updated] = await db
    .update(facilityInvites)
    .set({
      name: body.name !== undefined ? body.name : invite.name,
      isActive: body.isActive !== undefined ? body.isActive : invite.isActive,
      expiresAt: body.expiresAt !== undefined ? (body.expiresAt ? new Date(body.expiresAt) : null) : invite.expiresAt,
    })
    .where(eq(facilityInvites.id, inviteId))
    .returning();

  return c.json(updated);
});

// DELETE /:inviteId - Deactivate invite
app.delete("/:inviteId", async (c) => {
  const userId = c.get("userId") as string;
  const inviteId = c.req.param("inviteId");

  const [invite] = await db
    .select()
    .from(facilityInvites)
    .where(eq(facilityInvites.id, inviteId))
    .limit(1);

  if (!invite) return c.json({ error: "Invite not found" }, 404);
  await assertFacilityPermission(invite.facilityId, userId, "invites:manage");

  const [updated] = await db
    .update(facilityInvites)
    .set({ isActive: false })
    .where(eq(facilityInvites.id, inviteId))
    .returning();

  return c.json(updated);
});

// GET /:inviteId/submissions - List submissions for invite
app.get("/:inviteId/submissions", async (c) => {
  const userId = c.get("userId") as string;
  const inviteId = c.req.param("inviteId");

  const [invite] = await db
    .select()
    .from(facilityInvites)
    .where(eq(facilityInvites.id, inviteId))
    .limit(1);

  if (!invite) return c.json({ error: "Invite not found" }, 404);
  await assertFacilityPermission(invite.facilityId, userId, "invites:manage");

  const submissions = await db
    .select({
      id: inviteSubmissions.id,
      status: inviteSubmissions.status,
      completedForms: inviteSubmissions.completedForms,
      createdAt: inviteSubmissions.createdAt,
      completedAt: inviteSubmissions.completedAt,
      userName: users.name,
      userEmail: users.email,
      childFirstName: children.firstName,
      childLastName: children.lastName,
    })
    .from(inviteSubmissions)
    .innerJoin(users, eq(inviteSubmissions.userId, users.id))
    .leftJoin(children, eq(inviteSubmissions.childId, children.id))
    .where(eq(inviteSubmissions.inviteId, inviteId))
    .orderBy(desc(inviteSubmissions.createdAt));

  return c.json(submissions);
});

export { app as adminInvitesRoutes };
