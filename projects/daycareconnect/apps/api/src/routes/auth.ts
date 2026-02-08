import { Hono } from "hono";
import { auth } from "../lib/auth";

const app = new Hono();

app.all("/*", async (c) => {
  try {
    console.log("Auth request:", {
      method: c.req.method,
      path: c.req.path,
      url: c.req.url,
    });

    const response = await auth.handler(c.req.raw);

    console.log("Auth response:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    return response;
  } catch (error: any) {
    console.error("Auth handler error:", error);
    console.error("Error stack:", error?.stack);
    console.error("Error details:", {
      message: error?.message,
      name: error?.name,
      cause: error?.cause,
    });
    return c.json(
      {
        error: error?.message || "Authentication error",
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      500
    );
  }
});

export { app as authRoutes };
