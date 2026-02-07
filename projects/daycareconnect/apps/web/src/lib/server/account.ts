import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import { db, users, eq } from "@daycare-hub/db";
import { updateProfileSchema, changePasswordSchema } from "@daycare-hub/shared";

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => updateProfileSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [updated] = await db
      .update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        name: `${data.firstName} ${data.lastName}`.trim(),
        phone: data.phone || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .returning();

    return updated;
  });

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => changePasswordSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await auth.api.changePassword({
      headers,
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
    });

    return { success: true };
  });
