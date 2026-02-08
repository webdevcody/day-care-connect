import { Hono } from "hono";
import { db, facilityStaff, facilities, eq } from "@daycare-hub/db";

const app = new Hono();

app.get("/assignments", async (c) => {
  const userId = c.get("userId") as string;

  const assignments = await db
    .select({
      id: facilityStaff.id,
      staffRole: facilityStaff.staffRole,
      facilityId: facilities.id,
      facilityName: facilities.name,
      facilityAddress: facilities.address,
      facilityCity: facilities.city,
      facilityState: facilities.state,
    })
    .from(facilityStaff)
    .innerJoin(facilities, eq(facilityStaff.facilityId, facilities.id))
    .where(eq(facilityStaff.userId, userId));

  return c.json({ assignments });
});

export { app as staffRoutes };
