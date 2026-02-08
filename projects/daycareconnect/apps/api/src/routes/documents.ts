import { Hono } from "hono";
import {
  db,
  documentInstances,
  documentTemplates,
  facilities,
  children,
  eq,
  and,
  desc,
} from "@daycare-hub/db";

const app = new Hono();

app.get("/", async (c) => {
  const userId = c.get("userId") as string;

  const result = await db
    .select({
      id: documentInstances.id,
      templateId: documentInstances.templateId,
      templateVersion: documentInstances.templateVersion,
      templateTitle: documentTemplates.title,
      templateCategory: documentTemplates.category,
      facilityId: documentInstances.facilityId,
      facilityName: facilities.name,
      status: documentInstances.status,
      expiresAt: documentInstances.expiresAt,
      viewedAt: documentInstances.viewedAt,
      signedAt: documentInstances.signedAt,
      createdAt: documentInstances.createdAt,
      childId: documentInstances.childId,
    })
    .from(documentInstances)
    .innerJoin(documentTemplates, eq(documentInstances.templateId, documentTemplates.id))
    .innerJoin(facilities, eq(documentInstances.facilityId, facilities.id))
    .where(eq(documentInstances.parentId, userId))
    .orderBy(desc(documentInstances.createdAt));

  return c.json(result);
});

app.get("/:instanceId", async (c) => {
  const userId = c.get("userId") as string;
  const instanceId = c.req.param("instanceId");

  const [instance] = await db
    .select({
      id: documentInstances.id,
      templateId: documentInstances.templateId,
      templateVersion: documentInstances.templateVersion,
      templateTitle: documentTemplates.title,
      templateCategory: documentTemplates.category,
      templateDescription: documentTemplates.description,
      facilityId: documentInstances.facilityId,
      facilityName: facilities.name,
      status: documentInstances.status,
      contentSnapshot: documentInstances.contentSnapshot,
      expiresAt: documentInstances.expiresAt,
      viewedAt: documentInstances.viewedAt,
      signedAt: documentInstances.signedAt,
      signatureName: documentInstances.signatureName,
      createdAt: documentInstances.createdAt,
      childId: documentInstances.childId,
    })
    .from(documentInstances)
    .innerJoin(documentTemplates, eq(documentInstances.templateId, documentTemplates.id))
    .innerJoin(facilities, eq(documentInstances.facilityId, facilities.id))
    .where(
      and(eq(documentInstances.id, instanceId), eq(documentInstances.parentId, userId))
    )
    .limit(1);

  if (!instance) {
    return c.json({ error: "Document not found" }, 404);
  }

  let childName: string | null = null;
  if (instance.childId) {
    const [child] = await db
      .select({ firstName: children.firstName, lastName: children.lastName })
      .from(children)
      .where(eq(children.id, instance.childId))
      .limit(1);
    if (child) {
      childName = `${child.firstName} ${child.lastName}`;
    }
  }

  return c.json({ ...instance, childName });
});

app.post("/:instanceId/viewed", async (c) => {
  const userId = c.get("userId") as string;
  const instanceId = c.req.param("instanceId");

  const [instance] = await db
    .select({ id: documentInstances.id, status: documentInstances.status })
    .from(documentInstances)
    .where(
      and(eq(documentInstances.id, instanceId), eq(documentInstances.parentId, userId))
    )
    .limit(1);

  if (!instance) {
    return c.json({ error: "Document not found" }, 404);
  }

  if (instance.status === "pending") {
    await db
      .update(documentInstances)
      .set({ status: "viewed", viewedAt: new Date() })
      .where(eq(documentInstances.id, instanceId));
  }

  return c.json({ success: true });
});

app.post("/:instanceId/sign", async (c) => {
  const userId = c.get("userId") as string;
  const instanceId = c.req.param("instanceId");
  const body = await c.req.json();

  const [instance] = await db
    .select({ id: documentInstances.id, status: documentInstances.status })
    .from(documentInstances)
    .where(
      and(eq(documentInstances.id, instanceId), eq(documentInstances.parentId, userId))
    )
    .limit(1);

  if (!instance) {
    return c.json({ error: "Document not found" }, 404);
  }

  if (instance.status === "signed" || instance.status === "voided" || instance.status === "expired") {
    return c.json({ error: `Document cannot be signed (status: ${instance.status})` }, 400);
  }

  const ip =
    c.req.header("x-forwarded-for") ||
    c.req.header("x-real-ip") ||
    "unknown";
  const userAgent = c.req.header("user-agent") || "unknown";

  const [updated] = await db
    .update(documentInstances)
    .set({
      status: "signed",
      signedAt: new Date(),
      signatureName: body.signatureName,
      signatureIp: ip,
      signatureUserAgent: userAgent,
    })
    .where(eq(documentInstances.id, instanceId))
    .returning();

  return c.json(updated);
});

export { app as documentsRoutes };
