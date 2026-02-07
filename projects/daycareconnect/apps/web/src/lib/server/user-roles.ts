import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import { db, users, userRoles, eq, and } from "@daycare-hub/db";
import { USER_ROLES } from "@daycare-hub/shared";

export const getUserRoles = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const roles = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, session.user.id));

    return {
      activeRole: (session.user as any).role as string,
      roles: roles.map((r) => r.role),
    };
  }
);

export const switchRole = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => {
    const role = data.role as string;
    if (!role || !USER_ROLES.includes(role as any)) {
      throw new Error("Invalid role");
    }
    return { role };
  })
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    // Verify user has this role
    const existing = await db
      .select()
      .from(userRoles)
      .where(
        and(eq(userRoles.userId, session.user.id), eq(userRoles.role, data.role))
      );

    if (existing.length === 0) {
      throw new Error("You do not have this role");
    }

    // Update active role
    await db
      .update(users)
      .set({ role: data.role })
      .where(eq(users.id, session.user.id));

    return { activeRole: data.role };
  });

export const activateRole = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => {
    const role = data.role as string;
    if (!role || !USER_ROLES.includes(role as any)) {
      throw new Error("Invalid role");
    }
    return { role };
  })
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await db
      .insert(userRoles)
      .values({ userId: session.user.id, role: data.role })
      .onConflictDoNothing();

    return { success: true };
  });

export const deactivateRole = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => {
    const role = data.role as string;
    if (!role || !USER_ROLES.includes(role as any)) {
      throw new Error("Invalid role");
    }
    return { role };
  })
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const activeRole = (session.user as any).role;
    if (data.role === activeRole) {
      throw new Error("Cannot deactivate your active role");
    }

    // Ensure at least 1 role remains
    const allRoles = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, session.user.id));

    if (allRoles.length <= 1) {
      throw new Error("Must keep at least one role");
    }

    await db
      .delete(userRoles)
      .where(
        and(eq(userRoles.userId, session.user.id), eq(userRoles.role, data.role))
      );

    return { success: true };
  });
