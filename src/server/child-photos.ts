import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { childPhotos, children, facilities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

async function requireFacilityOwnerForChild(
  childId: string,
  headers: Headers
) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new Error("Unauthorized");

  const [child] = await db
    .select()
    .from(children)
    .where(eq(children.id, childId))
    .limit(1);

  if (!child) throw new Error("Child not found");

  const [facility] = await db
    .select()
    .from(facilities)
    .where(eq(facilities.id, child.facilityId))
    .limit(1);

  if (!facility || facility.ownerId !== session.user.id) {
    throw new Error("Not found");
  }

  return { session, child, facility };
}

export const getChildPhotos = createServerFn({ method: "GET" })
  .inputValidator((input: { childId: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwnerForChild(data.childId, request.headers);

    return db
      .select()
      .from(childPhotos)
      .where(eq(childPhotos.childId, data.childId))
      .orderBy(childPhotos.sortOrder);
  });

export const uploadChildPhoto = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      childId: string;
      fileName: string;
      fileData: string; // base64
      altText?: string;
    }) => input
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwnerForChild(data.childId, request.headers);

    const uploadsDir = join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const ext = data.fileName.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(uploadsDir, filename);

    const buffer = Buffer.from(data.fileData, "base64");
    await writeFile(filepath, buffer);

    const [photo] = await db
      .insert(childPhotos)
      .values({
        childId: data.childId,
        url: `/uploads/${filename}`,
        altText: data.altText,
      })
      .returning();

    return photo;
  });

export const deleteChildPhoto = createServerFn({ method: "POST" })
  .inputValidator((input: { photoId: string; childId: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwnerForChild(data.childId, request.headers);

    const [photo] = await db
      .select()
      .from(childPhotos)
      .where(
        and(
          eq(childPhotos.id, data.photoId),
          eq(childPhotos.childId, data.childId)
        )
      )
      .limit(1);

    if (!photo) throw new Error("Not found");

    // Delete file from disk
    try {
      const filepath = join(process.cwd(), photo.url);
      await unlink(filepath);
    } catch {
      // File may not exist, continue
    }

    await db
      .delete(childPhotos)
      .where(eq(childPhotos.id, data.photoId));

    return { success: true };
  });
