import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
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
import {
  createDocumentTemplateSchema,
  updateDocumentTemplateSchema,
  sendDocumentSchema,
  sendBulkDocumentSchema,
} from "@daycare-hub/shared";
import { assertFacilityManager } from "../facility-auth";
import { sendNotification } from "./notification-service";

export const getFacilityDocumentTemplates = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    return db
      .select()
      .from(documentTemplates)
      .where(eq(documentTemplates.facilityId, data.facilityId))
      .orderBy(asc(documentTemplates.isArchived), desc(documentTemplates.createdAt));
  });

export const createDocumentTemplate = createServerFn({ method: "POST" })
  .inputValidator((data: { facilityId: string } & Record<string, unknown>) => ({
    facilityId: data.facilityId,
    ...createDocumentTemplateSchema.parse(data),
  }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const { facilityId, ...templateData } = data;
    await assertFacilityManager(facilityId, session.user.id);

    const [template] = await db
      .insert(documentTemplates)
      .values({
        facilityId,
        ...templateData,
      })
      .returning();

    return template;
  });

export const updateDocumentTemplate = createServerFn({ method: "POST" })
  .inputValidator((data: { templateId: string } & Record<string, unknown>) => ({
    templateId: data.templateId,
    ...updateDocumentTemplateSchema.parse(data),
  }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const { templateId, ...updateData } = data;

    const [existing] = await db
      .select()
      .from(documentTemplates)
      .where(eq(documentTemplates.id, templateId))
      .limit(1);

    if (!existing) throw new Error("Template not found");
    await assertFacilityManager(existing.facilityId, session.user.id);

    const [updated] = await db
      .update(documentTemplates)
      .set({
        ...updateData,
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(documentTemplates.id, templateId))
      .returning();

    return updated;
  });

export const archiveDocumentTemplate = createServerFn({ method: "POST" })
  .inputValidator((data: { templateId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [existing] = await db
      .select()
      .from(documentTemplates)
      .where(eq(documentTemplates.id, data.templateId))
      .limit(1);

    if (!existing) throw new Error("Template not found");
    await assertFacilityManager(existing.facilityId, session.user.id);

    const [updated] = await db
      .update(documentTemplates)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(documentTemplates.id, data.templateId))
      .returning();

    return updated;
  });

export const sendDocument = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => sendDocumentSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [template] = await db
      .select()
      .from(documentTemplates)
      .where(eq(documentTemplates.id, data.templateId))
      .limit(1);

    if (!template) throw new Error("Template not found");
    if (template.isArchived) throw new Error("Template is archived");
    await assertFacilityManager(template.facilityId, session.user.id);

    const [facility] = await db
      .select({ name: facilities.name })
      .from(facilities)
      .where(eq(facilities.id, template.facilityId))
      .limit(1);

    const instances = await Promise.all(
      data.parentIds.map(async (parentId) => {
        const [instance] = await db
          .insert(documentInstances)
          .values({
            templateId: template.id,
            templateVersion: template.version,
            facilityId: template.facilityId,
            parentId,
            childId: data.childId || null,
            sentBy: session.user.id,
            contentSnapshot: template.content,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
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

    return instances;
  });

export const sendBulkDocument = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => sendBulkDocumentSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const [template] = await db
      .select()
      .from(documentTemplates)
      .where(eq(documentTemplates.id, data.templateId))
      .limit(1);

    if (!template) throw new Error("Template not found");
    if (template.isArchived) throw new Error("Template is archived");

    const [facility] = await db
      .select({ name: facilities.name })
      .from(facilities)
      .where(eq(facilities.id, data.facilityId))
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
          eq(enrollments.facilityId, data.facilityId),
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
            facilityId: data.facilityId,
            parentId,
            childId: data.childId || null,
            sentBy: session.user.id,
            contentSnapshot: template.content,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
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

    return instances;
  });

export const getFacilityDocumentInstances = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { facilityId: string; status?: string; templateId?: string }) => data
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const conditions = [eq(documentInstances.facilityId, data.facilityId)];

    if (data.status && data.status !== "all") {
      conditions.push(eq(documentInstances.status, data.status as any));
    }
    if (data.templateId) {
      conditions.push(eq(documentInstances.templateId, data.templateId));
    }

    return db
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
  });

export const getComplianceReport = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    // Get required templates
    const requiredTemplates = await db
      .select()
      .from(documentTemplates)
      .where(
        and(
          eq(documentTemplates.facilityId, data.facilityId),
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
          eq(enrollments.facilityId, data.facilityId),
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
      .where(eq(documentInstances.facilityId, data.facilityId));

    // Build unique families
    const familyMap = new Map<
      string,
      { parentId: string; parentName: string; parentEmail: string; children: { id: string; name: string }[] }
    >();

    for (const enrollment of activeEnrollments) {
      const existing = familyMap.get(enrollment.parentId);
      if (existing) {
        if (!existing.children.find((c) => c.id === enrollment.childId)) {
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
          status: instance?.status || "missing" as const,
          instanceId: instance?.id || null,
        };
      });

      return {
        ...family,
        documents: templateStatuses,
      };
    });

    return { requiredTemplates, compliance };
  });

export const sendDocumentReminder = createServerFn({ method: "POST" })
  .inputValidator((data: { instanceId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [instance] = await db
      .select()
      .from(documentInstances)
      .where(eq(documentInstances.id, data.instanceId))
      .limit(1);

    if (!instance) throw new Error("Document not found");
    await assertFacilityManager(instance.facilityId, session.user.id);

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

    return { success: true };
  });

export const voidDocument = createServerFn({ method: "POST" })
  .inputValidator((data: { instanceId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [instance] = await db
      .select()
      .from(documentInstances)
      .where(eq(documentInstances.id, data.instanceId))
      .limit(1);

    if (!instance) throw new Error("Document not found");
    await assertFacilityManager(instance.facilityId, session.user.id);

    const [updated] = await db
      .update(documentInstances)
      .set({ status: "voided" })
      .where(eq(documentInstances.id, data.instanceId))
      .returning();

    return updated;
  });

export const getFacilityParents = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

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
          eq(enrollments.facilityId, data.facilityId),
          eq(enrollments.status, "active")
        )
      );

    // Deduplicate
    const parentMap = new Map<string, { parentId: string; parentName: string; parentEmail: string }>();
    for (const r of result) {
      if (!parentMap.has(r.parentId)) {
        parentMap.set(r.parentId, r);
      }
    }

    return Array.from(parentMap.values());
  });
