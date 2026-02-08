import { Hono } from "hono";
import { db, userRoles, eq } from "@daycare-hub/db";

const app = new Hono();

app.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const user = c.get("user") as any;

  const roles = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  return c.json({
    activeRole: user.role,
    roles,
  });
});

export { app as userRolesRoutes };
