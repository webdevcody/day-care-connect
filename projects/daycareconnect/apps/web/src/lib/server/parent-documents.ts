import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
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
import { signDocumentSchema } from "@daycare-hub/shared";

export const getMyDocuments = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    return db
      .select({
        id: documentInstances.id,
        status: documentInstances.status,
        createdAt: documentInstances.createdAt,
        signedAt: documentInstances.signedAt,
        expiresAt: documentInstances.expiresAt,
        templateTitle: documentTemplates.title,
        templateCategory: documentTemplates.category,
        facilityName: facilities.name,
        facilityId: facilities.id,
      })
      .from(documentInstances)
      .innerJoin(documentTemplates, eq(documentInstances.templateId, documentTemplates.id))
      .innerJoin(facilities, eq(documentInstances.facilityId, facilities.id))
      .where(eq(documentInstances.parentId, session.user.id))
      .orderBy(desc(documentInstances.createdAt));
  }
);

export const getDocumentDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { instanceId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [instance] = await db
      .select({
        id: documentInstances.id,
        status: documentInstances.status,
        contentSnapshot: documentInstances.contentSnapshot,
        createdAt: documentInstances.createdAt,
        signedAt: documentInstances.signedAt,
        signatureName: documentInstances.signatureName,
        viewedAt: documentInstances.viewedAt,
        expiresAt: documentInstances.expiresAt,
        childId: documentInstances.childId,
        templateTitle: documentTemplates.title,
        templateCategory: documentTemplates.category,
        facilityName: facilities.name,
      })
      .from(documentInstances)
      .innerJoin(documentTemplates, eq(documentInstances.templateId, documentTemplates.id))
      .innerJoin(facilities, eq(documentInstances.facilityId, facilities.id))
      .where(
        and(
          eq(documentInstances.id, data.instanceId),
          eq(documentInstances.parentId, session.user.id)
        )
      )
      .limit(1);

    if (!instance) throw new Error("Document not found");

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

    return { ...instance, childName };
  });

export const markDocumentViewed = createServerFn({ method: "POST" })
  .inputValidator((data: { instanceId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [instance] = await db
      .select()
      .from(documentInstances)
      .where(
        and(
          eq(documentInstances.id, data.instanceId),
          eq(documentInstances.parentId, session.user.id)
        )
      )
      .limit(1);

    if (!instance) throw new Error("Document not found");

    if (instance.status === "pending") {
      await db
        .update(documentInstances)
        .set({ status: "viewed", viewedAt: new Date() })
        .where(eq(documentInstances.id, data.instanceId));
    }

    return { success: true };
  });

export const signDocument = createServerFn({ method: "POST" })
  .inputValidator((data: { instanceId: string } & Record<string, unknown>) => ({
    instanceId: data.instanceId,
    ...signDocumentSchema.parse(data),
  }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [instance] = await db
      .select()
      .from(documentInstances)
      .where(
        and(
          eq(documentInstances.id, data.instanceId),
          eq(documentInstances.parentId, session.user.id)
        )
      )
      .limit(1);

    if (!instance) throw new Error("Document not found");

    if (instance.status === "signed") {
      throw new Error("Document is already signed");
    }
    if (instance.status === "voided") {
      throw new Error("Document has been voided");
    }
    if (instance.status === "expired") {
      throw new Error("Document has expired");
    }
    if (instance.expiresAt && new Date(instance.expiresAt) < new Date()) {
      throw new Error("Document has expired");
    }

    // Extract IP and user agent from headers
    const reqHeaders = getRequestHeaders();
    const ip =
      reqHeaders["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      reqHeaders["x-real-ip"]?.toString() ||
      "unknown";
    const userAgent = reqHeaders["user-agent"]?.toString() || "unknown";

    const [updated] = await db
      .update(documentInstances)
      .set({
        status: "signed",
        signedAt: new Date(),
        signatureName: data.signatureName,
        signatureIp: ip,
        signatureUserAgent: userAgent,
      })
      .where(eq(documentInstances.id, data.instanceId))
      .returning();

    return updated;
  });
