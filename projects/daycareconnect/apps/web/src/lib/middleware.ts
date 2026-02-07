import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth";

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session) {
    throw redirect({ to: "/login" });
  }

  return next({ context: { session } });
});

function createRoleMiddleware(requiredRole: string) {
  return createMiddleware().server(async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw redirect({ to: "/login" });
    }

    if ((session.user as any).role !== requiredRole) {
      throw redirect({ to: "/unauthorized" });
    }

    return next({ context: { session } });
  });
}

export const parentMiddleware = createRoleMiddleware("parent");
export const facilityMiddleware = createRoleMiddleware("admin");
export const staffMiddleware = createRoleMiddleware("staff");
