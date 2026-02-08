import { Hono } from "hono";
import {
  db,
  facilityInvites,
  inviteSubmissions,
  facilities,
  documentTemplates,
  documentInstances,
  children,
  enrollments,
  eq,
  and,
  asc,
} from "@daycare-hub/db";
import { auth } from "../lib/auth";
import { sendNotification } from "../lib/notification-service";

const app = new Hono();

// GET /:code - Public: Get invite info + required enrollment templates
app.get("/:code", async (c) => {
  const code = c.req.param("code");

  const [invite] = await db
    .select()
    .from(facilityInvites)
    .where(and(eq(facilityInvites.code, code), eq(facilityInvites.isActive, true)))
    .limit(1);

  if (!invite) {
    return c.json({ error: "Invite not found or expired" }, 404);
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return c.json({ error: "This invite has expired" }, 410);
  }

  const [facility] = await db
    .select({
      id: facilities.id,
      name: facilities.name,
      description: facilities.description,
      city: facilities.city,
      state: facilities.state,
      phone: facilities.phone,
    })
    .from(facilities)
    .where(eq(facilities.id, invite.facilityId))
    .limit(1);

  const templates = await db
    .select()
    .from(documentTemplates)
    .where(
      and(
        eq(documentTemplates.facilityId, invite.facilityId),
        eq(documentTemplates.isRequiredForEnrollment, true),
        eq(documentTemplates.isArchived, false)
      )
    )
    .orderBy(asc(documentTemplates.sortOrder));

  return c.json({ invite, facility, templates });
});

// Authenticated routes - inline auth check
async function requireAuth(c: any): Promise<string | null> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return null;
  }
  return session.user.id;
}

// POST /:code/start - Start invite submission (create child + submission)
app.post("/:code/start", async (c) => {
  const userId = await requireAuth(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const code = c.req.param("code");
  const body = await c.req.json();

  const [invite] = await db
    .select()
    .from(facilityInvites)
    .where(and(eq(facilityInvites.code, code), eq(facilityInvites.isActive, true)))
    .limit(1);

  if (!invite) return c.json({ error: "Invite not found" }, 404);
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return c.json({ error: "This invite has expired" }, 410);
  }

  let childId = body.childId;

  // Create new child if child data provided
  if (!childId && body.child) {
    const [newChild] = await db
      .insert(children)
      .values({
        parentId: userId,
        firstName: body.child.firstName,
        lastName: body.child.lastName,
        dateOfBirth: body.child.dateOfBirth,
        gender: body.child.gender || null,
        allergies: body.child.allergies || null,
        medicalNotes: body.child.medicalNotes || null,
        emergencyContactName: body.child.emergencyContactName || null,
        emergencyContactPhone: body.child.emergencyContactPhone || null,
      })
      .returning();
    childId = newChild.id;
  }

  // Check for existing in-progress submission
  const [existing] = await db
    .select()
    .from(inviteSubmissions)
    .where(
      and(
        eq(inviteSubmissions.inviteId, invite.id),
        eq(inviteSubmissions.userId, userId),
        eq(inviteSubmissions.status, "in_progress")
      )
    )
    .limit(1);

  if (existing) {
    // Update with new child if changed
    if (childId) {
      const [updated] = await db
        .update(inviteSubmissions)
        .set({ childId })
        .where(eq(inviteSubmissions.id, existing.id))
        .returning();
      return c.json(updated);
    }
    return c.json(existing);
  }

  const [submission] = await db
    .insert(inviteSubmissions)
    .values({
      inviteId: invite.id,
      userId,
      childId: childId || null,
    })
    .returning();

  return c.json(submission);
});

// POST /:code/submit-form - Submit one form in the invite flow
app.post("/:code/submit-form", async (c) => {
  const userId = await requireAuth(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const code = c.req.param("code");
  const body = await c.req.json();
  const { templateId, formData, signatureName } = body;

  const [invite] = await db
    .select()
    .from(facilityInvites)
    .where(and(eq(facilityInvites.code, code), eq(facilityInvites.isActive, true)))
    .limit(1);

  if (!invite) return c.json({ error: "Invite not found" }, 404);

  const [template] = await db
    .select()
    .from(documentTemplates)
    .where(eq(documentTemplates.id, templateId))
    .limit(1);

  if (!template) return c.json({ error: "Template not found" }, 404);

  // Find the user's submission
  const [submission] = await db
    .select()
    .from(inviteSubmissions)
    .where(
      and(
        eq(inviteSubmissions.inviteId, invite.id),
        eq(inviteSubmissions.userId, userId),
        eq(inviteSubmissions.status, "in_progress")
      )
    )
    .limit(1);

  if (!submission) return c.json({ error: "No active submission found" }, 404);

  // Create document instance
  const [instance] = await db
    .insert(documentInstances)
    .values({
      templateId: template.id,
      templateVersion: template.version,
      facilityId: invite.facilityId,
      parentId: userId,
      childId: submission.childId,
      sentBy: userId,
      contentSnapshot: template.content || "",
      formData: formData || null,
      status: "signed",
      signedAt: new Date(),
      signatureName: signatureName || null,
    })
    .returning();

  // Update completed forms list
  const completedForms = [...(submission.completedForms as string[]), templateId];
  await db
    .update(inviteSubmissions)
    .set({ completedForms })
    .where(eq(inviteSubmissions.id, submission.id));

  return c.json(instance);
});

// POST /:code/complete - Complete the invite flow
app.post("/:code/complete", async (c) => {
  const userId = await requireAuth(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const code = c.req.param("code");
  const body = await c.req.json();

  const [invite] = await db
    .select()
    .from(facilityInvites)
    .where(and(eq(facilityInvites.code, code), eq(facilityInvites.isActive, true)))
    .limit(1);

  if (!invite) return c.json({ error: "Invite not found" }, 404);

  const [submission] = await db
    .select()
    .from(inviteSubmissions)
    .where(
      and(
        eq(inviteSubmissions.inviteId, invite.id),
        eq(inviteSubmissions.userId, userId),
        eq(inviteSubmissions.status, "in_progress")
      )
    )
    .limit(1);

  if (!submission) return c.json({ error: "No active submission found" }, 404);

  // Verify all required forms are completed
  const requiredTemplates = await db
    .select({ id: documentTemplates.id })
    .from(documentTemplates)
    .where(
      and(
        eq(documentTemplates.facilityId, invite.facilityId),
        eq(documentTemplates.isRequiredForEnrollment, true),
        eq(documentTemplates.isArchived, false)
      )
    );

  const completedForms = submission.completedForms as string[];
  const missingForms = requiredTemplates.filter((t) => !completedForms.includes(t.id));

  if (missingForms.length > 0) {
    return c.json({ error: "Not all required forms have been completed" }, 400);
  }

  // Create pending enrollment
  const [enrollment] = await db
    .insert(enrollments)
    .values({
      childId: submission.childId!,
      facilityId: invite.facilityId,
      status: "pending",
      scheduleType: body.scheduleType || "full_time",
      startDate: body.startDate || null,
      notes: body.notes || null,
    })
    .returning();

  // Update submission as completed
  await db
    .update(inviteSubmissions)
    .set({
      status: "completed",
      enrollmentId: enrollment.id,
      completedAt: new Date(),
    })
    .where(eq(inviteSubmissions.id, submission.id));

  // Notify facility owner
  const [facility] = await db
    .select({ ownerId: facilities.ownerId, name: facilities.name })
    .from(facilities)
    .where(eq(facilities.id, invite.facilityId))
    .limit(1);

  if (facility) {
    await sendNotification({
      type: "enrollment_submitted",
      recipientId: facility.ownerId,
      data: { facilityName: facility.name },
      actionUrl: `/facility/${invite.facilityId}/enrollments`,
    });
  }

  return c.json({ enrollment, submission: { ...submission, status: "completed" } });
});

export { app as inviteRoutes };
