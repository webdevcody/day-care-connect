import { Hono } from "hono";
import { db, enrollments, children, users, eq, and, facilities } from "@daycare-hub/db";
import { assertFacilityPermission } from "../../lib/facility-auth";
import { getEmailProvider } from "../../lib/email";
import type { EmailMessage } from "../../lib/email";

const app = new Hono();

// ─── GET /:facilityId/parents ───────────────────────────────────────────────
// Returns distinct parents who have at least one actively enrolled child.
app.get("/:facilityId/parents", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "messaging:send");

  const rows = await db
    .select({
      parentId: users.id,
      parentName: users.name,
      parentEmail: users.email,
      parentFirstName: users.firstName,
      parentLastName: users.lastName,
      childFirstName: children.firstName,
      childLastName: children.lastName,
    })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .innerJoin(users, eq(children.parentId, users.id))
    .where(and(eq(enrollments.facilityId, facilityId), eq(enrollments.status, "active")));

  // Group children under each parent
  const parentMap = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      firstName: string;
      lastName: string;
      children: { firstName: string; lastName: string }[];
    }
  >();

  for (const row of rows) {
    const existing = parentMap.get(row.parentId);
    const child = { firstName: row.childFirstName, lastName: row.childLastName };

    if (existing) {
      existing.children.push(child);
    } else {
      parentMap.set(row.parentId, {
        id: row.parentId,
        name: row.parentName,
        email: row.parentEmail,
        firstName: row.parentFirstName,
        lastName: row.parentLastName,
        children: [child],
      });
    }
  }

  return c.json(Array.from(parentMap.values()));
});

// ─── POST /:facilityId/send ─────────────────────────────────────────────────
// Sends an email to selected parents.
//
// Body:
//   parentIds: string[]     – IDs of parents to email (empty = all enrolled)
//   subject:   string
//   body:      string       – plain-text message
app.post("/:facilityId/send", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "messaging:send");

  const { parentIds, subject, body } = await c.req.json<{
    parentIds: string[];
    subject: string;
    body: string;
  }>();

  if (!subject?.trim()) throw new Error("Subject is required");
  if (!body?.trim()) throw new Error("Message body is required");

  // Fetch facility info for the reply-to / sender context
  const [facility] = await db
    .select({ name: facilities.name, email: facilities.email })
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (!facility) throw new Error("Facility not found");

  // Build the list of target parents
  const conditions = [eq(enrollments.facilityId, facilityId), eq(enrollments.status, "active")];

  const rows = await db
    .select({
      parentId: users.id,
      parentName: users.name,
      parentEmail: users.email,
    })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .innerJoin(users, eq(children.parentId, users.id))
    .where(and(...conditions));

  // De-duplicate parents
  const uniqueParents = new Map<string, { name: string; email: string }>();
  for (const row of rows) {
    if (!uniqueParents.has(row.parentId)) {
      uniqueParents.set(row.parentId, {
        name: row.parentName,
        email: row.parentEmail,
      });
    }
  }

  // If specific parents were requested, filter to only those
  let recipients = Array.from(uniqueParents.entries());
  if (parentIds && parentIds.length > 0) {
    const idSet = new Set(parentIds);
    recipients = recipients.filter(([id]) => idSet.has(id));
  }

  if (recipients.length === 0) {
    throw new Error("No recipients found");
  }

  // Build email messages — one per parent so they each get a personal To header
  const emailProvider = getEmailProvider();
  const messages: EmailMessage[] = recipients.map(([, parent]) => ({
    to: [{ email: parent.email, name: parent.name }],
    subject,
    text: body,
    replyTo: facility.email ?? undefined,
  }));

  const results = await emailProvider.sendBatch(messages);
  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return c.json({ sent, failed, total: recipients.length });
});

export { app as adminEmailsRoutes };
