import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { attendanceRecords, children, facilities } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function requireFacilityOwner(facilityId: string, headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new Error("Unauthorized");

  const [facility] = await db
    .select()
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (!facility || facility.ownerId !== session.user.id) {
    throw new Error("Not found");
  }

  return { session, facility };
}

export const signInChild = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      childId: string;
      facilityId: string;
      notes?: string;
    }) => input
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const { session } = await requireFacilityOwner(
      data.facilityId,
      request.headers
    );

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8); // HH:MM:SS
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    const [record] = await db
      .insert(attendanceRecords)
      .values({
        childId: data.childId,
        facilityId: data.facilityId,
        date: dateStr,
        signInTime: timeStr,
        signedInBy: session.user.id,
        notes: data.notes,
      })
      .returning();

    return record;
  });

export const signOutChild = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      recordId: string;
      facilityId: string;
    }) => input
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const { session } = await requireFacilityOwner(
      data.facilityId,
      request.headers
    );

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);

    const [updated] = await db
      .update(attendanceRecords)
      .set({
        signOutTime: timeStr,
        signedOutBy: session.user.id,
      })
      .where(
        and(
          eq(attendanceRecords.id, data.recordId),
          eq(attendanceRecords.facilityId, data.facilityId)
        )
      )
      .returning();

    if (!updated) throw new Error("Not found");
    return updated;
  });

export const getAttendanceByDate = createServerFn({ method: "GET" })
  .inputValidator((input: { facilityId: string; date: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwner(data.facilityId, request.headers);

    const records = await db
      .select({
        id: attendanceRecords.id,
        childId: attendanceRecords.childId,
        date: attendanceRecords.date,
        signInTime: attendanceRecords.signInTime,
        signOutTime: attendanceRecords.signOutTime,
        signedInBy: attendanceRecords.signedInBy,
        signedOutBy: attendanceRecords.signedOutBy,
        notes: attendanceRecords.notes,
        child: {
          id: children.id,
          firstName: children.firstName,
          lastName: children.lastName,
          status: children.status,
        },
      })
      .from(attendanceRecords)
      .innerJoin(children, eq(attendanceRecords.childId, children.id))
      .where(
        and(
          eq(attendanceRecords.facilityId, data.facilityId),
          eq(attendanceRecords.date, data.date)
        )
      )
      .orderBy(attendanceRecords.signInTime);

    return records;
  });

export const getChildAttendanceHistory = createServerFn({ method: "GET" })
  .inputValidator(
    (input: { childId: string; facilityId: string; limit?: number }) => input
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    await requireFacilityOwner(data.facilityId, request.headers);

    return db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.childId, data.childId),
          eq(attendanceRecords.facilityId, data.facilityId)
        )
      )
      .orderBy(desc(attendanceRecords.date))
      .limit(data.limit ?? 50);
  });
