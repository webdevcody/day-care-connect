import { Hono } from "hono";
import { db, reportTemplates, eq } from "@daycare-hub/db";
import { assertFacilityPermission } from "../../lib/facility-auth";

const app = new Hono();

// GET /:facilityId - Get report templates for a facility
app.get("/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  const results = await db
    .select()
    .from(reportTemplates)
    .where(eq(reportTemplates.facilityId, facilityId))
    .orderBy(reportTemplates.name);

  return c.json(results);
});

// POST / - Create a report template
app.post("/", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { facilityId, name, entries } = body;

  await assertFacilityPermission(facilityId, userId, "daily_reports:manage");

  const [template] = await db
    .insert(reportTemplates)
    .values({
      facilityId,
      name,
      entries,
    })
    .returning();

  return c.json(template);
});

export { app as adminReportTemplatesRoutes };
