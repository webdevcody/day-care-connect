import type { Context, Next } from "hono";
import { auth } from "../lib/auth";

export const authMiddleware = async (c: Context, next: Next) => {
  try {
    // better-auth expects either a Request object or headers
    // Pass the full request object for better compatibility
    const session = await auth.api.getSession(c.req.raw);

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("userId", session.user.id);
    c.set("user", session.user);
    c.set("session", session.session);

    await next();
  } catch (error: any) {
    console.error("Auth middleware error:", error);
    // Log more details for debugging
    console.error("Request URL:", c.req.url);
    console.error("Request headers:", Object.fromEntries(c.req.raw.headers.entries()));
    return c.json({ error: error?.message || "Failed to get session" }, 401);
  }
};
