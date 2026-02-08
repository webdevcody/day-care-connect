import { Hono } from "hono";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const app = new Hono();

// POST /pdf - Upload a PDF file
app.post("/pdf", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No PDF file provided" }, 400);
  }

  if (file.type !== "application/pdf") {
    return c.json({ error: "File must be a PDF" }, 400);
  }

  const filename = `${randomUUID()}.pdf`;
  const uploadDir = join(process.cwd(), "uploads", "documents");
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(uploadDir, filename), buffer);

  const url = `/uploads/documents/${filename}`;
  return c.json({ url });
});

export { app as uploadRoutes };
