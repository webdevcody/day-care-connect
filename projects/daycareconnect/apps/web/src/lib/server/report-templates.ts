import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import { db, reportTemplates, eq } from "@daycare-hub/db";
import {
  createReportTemplateSchema,
  getReportTemplatesSchema,
} from "@daycare-hub/shared";
import { assertFacilityManager } from "../facility-auth";

export const getReportTemplates = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { facilityId: string }) => getReportTemplatesSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    return db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.facilityId, data.facilityId))
      .orderBy(reportTemplates.name);
  });

export const createReportTemplate = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    createReportTemplateSchema.parse(data)
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const [template] = await db
      .insert(reportTemplates)
      .values({
        facilityId: data.facilityId,
        name: data.name,
        entries: data.entries,
      })
      .returning();

    return template;
  });
