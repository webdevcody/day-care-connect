import type { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error("API Error:", err);
  const status = (err as any).status || 500;
  const message = err.message || "Internal server error";
  return c.json({ error: message }, status);
};
