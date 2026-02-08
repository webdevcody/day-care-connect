import { Hono } from "hono";
import { db, users, userRoles, eq, and } from "@daycare-hub/db";

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

app.post("/switch", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { role } = body;

  // Verify user has this role
  const [existingRole] = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
    .limit(1);

  if (!existingRole) {
    return c.json({ error: "You do not have this role" }, 403);
  }

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return c.json({ activeRole: role });
});

app.post("/activate", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { role } = body;

  await db
    .insert(userRoles)
    .values({ userId, role })
    .onConflictDoNothing();

  return c.json({ success: true });
});

app.post("/deactivate", async (c) => {
  const userId = c.get("userId") as string;
  const user = c.get("user") as any;
  const body = await c.req.json();
  const { role } = body;

  // Check not the active role
  if (user.role === role) {
    return c.json({ error: "Cannot deactivate your currently active role" }, 400);
  }

  // Ensure at least 1 role remains
  const allRoles = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  if (allRoles.length <= 1) {
    return c.json({ error: "Must have at least one role" }, 400);
  }

  await db
    .delete(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)));

  return c.json({ success: true });
});

export { app as userRolesRoutes };
