import { Hono } from "hono";
import {
  db,
  documentTemplates,
  documentInstances,
  facilities,
  enrollments,
  children,
  users,
  eq,
  and,
  inArray,
  desc,
  asc,
} from "@daycare-hub/db";
import { assertFacilityManager } from "../../lib/facility-auth";
import { sendNotification } from "../../lib/notification-service";

const app = new Hono();

// GET /templates/:facilityId - Get facility document templates
app.get("/templates/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityManager(facilityId, userId);

  const results = await db
    .select()
    .from(documentTemplates)
    .where(eq(documentTemplates.facilityId, facilityId))
    .orderBy(asc(documentTemplates.isArchived), desc(documentTemplates.createdAt));

  return c.json(results);
});

// POST /templates - Create a document template
app.post("/templates", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { facilityId, ...templateData } = body;

  await assertFacilityManager(facilityId, userId);

  const [template] = await db
    .insert(documentTemplates)
    .values({
      facilityId,
      ...templateData,
    })
    .returning();

  return c.json(template);
});

// PUT /templates/:templateId - Update a document template
app.put("/templates/:templateId", async (c) => {
  const userId = c.get("userId") as string;
  const templateId = c.req.param("templateId");
  const body = await c.req.json();

  const [existing] = await db
    .select()
    .from(documentTemplates)
    .where(eq(documentTemplates.id, templateId))
    .limit(1);

  if (!existing) throw new Error("Template not found");
  await assertFacilityManager(existing.facilityId, userId);

  const [updated] = await db
    .update(documentTemplates)
    .set({
      ...body,
      version: existing.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(documentTemplates.id, templateId))
    .returning();

  return c.json(updated);
});

// POST /templates/:templateId/archive - Archive a document template
app.post("/templates/:templateId/archive", async (c) => {
  const userId = c.get("userId") as string;
  const templateId = c.req.param("templateId");

  const [existing] = await db
    .select()
    .from(documentTemplates)
    .where(eq(documentTemplates.id, templateId))
    .limit(1);

  if (!existing) throw new Error("Template not found");
  await assertFacilityManager(existing.facilityId, userId);

  const [updated] = await db
    .update(documentTemplates)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(documentTemplates.id, templateId))
    .returning();

  return c.json(updated);
});

// POST /send - Send a document to specific parents
app.post("/send", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { templateId, parentIds, childId, expiresAt } = body;

  const [template] = await db
    .select()
    .from(documentTemplates)
    .where(eq(documentTemplates.id, templateId))
    .limit(1);

  if (!template) throw new Error("Template not found");
  if (template.isArchived) throw new Error("Template is archived");
  await assertFacilityManager(template.facilityId, userId);

  const [facility] = await db
    .select({ name: facilities.name })
    .from(facilities)
    .where(eq(facilities.id, template.facilityId))
    .limit(1);

  const instances = await Promise.all(
    parentIds.map(async (parentId: string) => {
      const [instance] = await db
        .insert(documentInstances)
        .values({
          templateId: template.id,
          templateVersion: template.version,
          facilityId: template.facilityId,
          parentId,
          childId: childId || null,
          sentBy: userId,
          contentSnapshot: template.content,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })
        .returning();

      await sendNotification({
        type: "document_requested",
        recipientId: parentId,
        data: {
          documentTitle: template.title,
          facilityName: facility?.name || "the facility",
        },
        actionUrl: `/parent/documents/${instance.id}`,
      });

      return instance;
    })
  );

  return c.json(instances);
});

// POST /send-bulk - Bulk send a document to all active parents
app.post("/send-bulk", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { facilityId, templateId, childId, expiresAt } = body;

  await assertFacilityManager(facilityId, userId);

  const [template] = await db
    .select()
    .from(documentTemplates)
    .where(eq(documentTemplates.id, templateId))
    .limit(1);

  if (!template) throw new Error("Template not found");
  if (template.isArchived) throw new Error("Template is archived");

  const [facility] = await db
    .select({ name: facilities.name })
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  // Find all parents with active enrollments at this facility
  const activeEnrollments = await db
    .select({
      parentId: children.parentId,
    })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .where(
      and(
        eq(enrollments.facilityId, facilityId),
        eq(enrollments.status, "active")
      )
    );

  const uniqueParentIds = [...new Set(activeEnrollments.map((e) => e.parentId))];

  const instances = await Promise.all(
    uniqueParentIds.map(async (parentId) => {
      const [instance] = await db
        .insert(documentInstances)
        .values({
          templateId: template.id,
          templateVersion: template.version,
          facilityId,
          parentId,
          childId: childId || null,
          sentBy: userId,
          contentSnapshot: template.content,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })
        .returning();

      await sendNotification({
        type: "document_requested",
        recipientId: parentId,
        data: {
          documentTitle: template.title,
          facilityName: facility?.name || "the facility",
        },
        actionUrl: `/parent/documents/${instance.id}`,
      });

      return instance;
    })
  );

  return c.json(instances);
});

// GET /instances/:facilityId - Get facility document instances
app.get("/instances/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const status = c.req.query("status");
  const templateId = c.req.query("templateId");

  await assertFacilityManager(facilityId, userId);

  const conditions = [eq(documentInstances.facilityId, facilityId)];

  if (status && status !== "all") {
    conditions.push(eq(documentInstances.status, status as any));
  }
  if (templateId) {
    conditions.push(eq(documentInstances.templateId, templateId));
  }

  const results = await db
    .select({
      id: documentInstances.id,
      status: documentInstances.status,
      templateId: documentInstances.templateId,
      parentId: documentInstances.parentId,
      childId: documentInstances.childId,
      signedAt: documentInstances.signedAt,
      signatureName: documentInstances.signatureName,
      viewedAt: documentInstances.viewedAt,
      expiresAt: documentInstances.expiresAt,
      createdAt: documentInstances.createdAt,
      templateTitle: documentTemplates.title,
      templateCategory: documentTemplates.category,
      parentName: users.name,
      parentEmail: users.email,
    })
    .from(documentInstances)
    .innerJoin(documentTemplates, eq(documentInstances.templateId, documentTemplates.id))
    .innerJoin(users, eq(documentInstances.parentId, users.id))
    .where(and(...conditions))
    .orderBy(desc(documentInstances.createdAt));

  return c.json(results);
});

// GET /compliance/:facilityId - Get compliance report
app.get("/compliance/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityManager(facilityId, userId);

  // Get required templates
  const requiredTemplates = await db
    .select()
    .from(documentTemplates)
    .where(
      and(
        eq(documentTemplates.facilityId, facilityId),
        eq(documentTemplates.isRequired, true),
        eq(documentTemplates.isArchived, false)
      )
    );

  // Get active enrolled families
  const activeEnrollments = await db
    .select({
      parentId: children.parentId,
      parentName: users.name,
      parentEmail: users.email,
      childId: children.id,
      childFirstName: children.firstName,
      childLastName: children.lastName,
    })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .innerJoin(users, eq(children.parentId, users.id))
    .where(
      and(
        eq(enrollments.facilityId, facilityId),
        eq(enrollments.status, "active")
      )
    );

  // Get all document instances for this facility
  const allInstances = await db
    .select({
      id: documentInstances.id,
      templateId: documentInstances.templateId,
      parentId: documentInstances.parentId,
      status: documentInstances.status,
    })
    .from(documentInstances)
    .where(eq(documentInstances.facilityId, facilityId));

  // Build unique families
  const familyMap = new Map<
    string,
    {
      parentId: string;
      parentName: string;
      parentEmail: string;
      children: { id: string; name: string }[];
    }
  >();

  for (const enrollment of activeEnrollments) {
    const existing = familyMap.get(enrollment.parentId);
    if (existing) {
      if (!existing.children.find((child) => child.id === enrollment.childId)) {
        existing.children.push({
          id: enrollment.childId,
          name: `${enrollment.childFirstName} ${enrollment.childLastName}`,
        });
      }
    } else {
      familyMap.set(enrollment.parentId, {
        parentId: enrollment.parentId,
        parentName: enrollment.parentName,
        parentEmail: enrollment.parentEmail,
        children: [
          {
            id: enrollment.childId,
            name: `${enrollment.childFirstName} ${enrollment.childLastName}`,
          },
        ],
      });
    }
  }

  const families = Array.from(familyMap.values());

  // Build compliance matrix
  const compliance = families.map((family) => {
    const templateStatuses = requiredTemplates.map((template) => {
      const instance = allInstances.find(
        (i) => i.templateId === template.id && i.parentId === family.parentId
      );
      return {
        templateId: template.id,
        templateTitle: template.title,
        status: instance?.status || ("missing" as const),
        instanceId: instance?.id || null,
      };
    });

    return {
      ...family,
      documents: templateStatuses,
    };
  });

  return c.json({ requiredTemplates, compliance });
});

// POST /remind/:instanceId - Send a document reminder
app.post("/remind/:instanceId", async (c) => {
  const userId = c.get("userId") as string;
  const instanceId = c.req.param("instanceId");

  const [instance] = await db
    .select()
    .from(documentInstances)
    .where(eq(documentInstances.id, instanceId))
    .limit(1);

  if (!instance) throw new Error("Document not found");
  await assertFacilityManager(instance.facilityId, userId);

  if (instance.status !== "pending" && instance.status !== "viewed") {
    throw new Error("Can only remind for pending or viewed documents");
  }

  const [template] = await db
    .select({ title: documentTemplates.title })
    .from(documentTemplates)
    .where(eq(documentTemplates.id, instance.templateId))
    .limit(1);

  const [facility] = await db
    .select({ name: facilities.name })
    .from(facilities)
    .where(eq(facilities.id, instance.facilityId))
    .limit(1);

  await sendNotification({
    type: "document_reminder",
    recipientId: instance.parentId,
    data: {
      documentTitle: template?.title || "Document",
      facilityName: facility?.name || "the facility",
    },
    actionUrl: `/parent/documents/${instance.id}`,
  });

  return c.json({ success: true });
});

// POST /void/:instanceId - Void a document
app.post("/void/:instanceId", async (c) => {
  const userId = c.get("userId") as string;
  const instanceId = c.req.param("instanceId");

  const [instance] = await db
    .select()
    .from(documentInstances)
    .where(eq(documentInstances.id, instanceId))
    .limit(1);

  if (!instance) throw new Error("Document not found");
  await assertFacilityManager(instance.facilityId, userId);

  const [updated] = await db
    .update(documentInstances)
    .set({ status: "voided" })
    .where(eq(documentInstances.id, instanceId))
    .returning();

  return c.json(updated);
});

// GET /parents/:facilityId - Get facility parents for documents
app.get("/parents/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityManager(facilityId, userId);

  const result = await db
    .select({
      parentId: children.parentId,
      parentName: users.name,
      parentEmail: users.email,
    })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .innerJoin(users, eq(children.parentId, users.id))
    .where(
      and(
        eq(enrollments.facilityId, facilityId),
        eq(enrollments.status, "active")
      )
    );

  // Deduplicate
  const parentMap = new Map<
    string,
    { parentId: string; parentName: string; parentEmail: string }
  >();
  for (const r of result) {
    if (!parentMap.has(r.parentId)) {
      parentMap.set(r.parentId, r);
    }
  }

  return c.json(Array.from(parentMap.values()));
});

export { app as adminDocumentsRoutes };
