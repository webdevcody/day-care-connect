import { Hono } from "hono";
import { db, users, eq } from "@daycare-hub/db";
import { auth } from "../lib/auth";

const app = new Hono();

app.put("/profile", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { firstName, lastName, phone } = body;

  const [updated] = await db
    .update(users)
    .set({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      phone,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return c.json(updated);
});

app.post("/change-password", async (c) => {
  const headers = c.req.raw.headers;
  const body = await c.req.json();
  const { currentPassword, newPassword } = body;

  await auth.api.changePassword({
    headers,
    body: { currentPassword, newPassword },
  });

  return c.json({ success: true });
});

export { app as accountRoutes };
