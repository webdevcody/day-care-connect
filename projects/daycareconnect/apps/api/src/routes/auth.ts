import { Hono } from "hono";
import { auth } from "../lib/auth";

const app = new Hono();

app.all("/*", async (c) => {
  return auth.handler(c.req.raw);
});

export { app as authRoutes };
