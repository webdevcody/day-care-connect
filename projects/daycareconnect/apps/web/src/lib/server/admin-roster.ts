import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import {
  db,
  enrollments,
  children,
  users,
  eq,
  and,
  or,
  ilike,
} from "@daycare-hub/db";
import { assertFacilityStaffOrOwner } from "../facility-auth";

export const getFacilityRoster = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string; search?: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityStaffOrOwner(data.facilityId, session.user.id);

    const conditions = [
      eq(enrollments.facilityId, data.facilityId),
      or(eq(enrollments.status, "active"), eq(enrollments.status, "approved")),
    ];

    const results = await db
      .select({
        enrollmentId: enrollments.id,
        scheduleType: enrollments.scheduleType,
        startDate: enrollments.startDate,
        childId: children.id,
        childFirstName: children.firstName,
        childLastName: children.lastName,
        childDateOfBirth: children.dateOfBirth,
        childAllergies: children.allergies,
        childMedicalNotes: children.medicalNotes,
        childEmergencyContactName: children.emergencyContactName,
        childEmergencyContactPhone: children.emergencyContactPhone,
        parentName: users.name,
        parentEmail: users.email,
        parentPhone: users.phone,
      })
      .from(enrollments)
      .innerJoin(children, eq(enrollments.childId, children.id))
      .innerJoin(users, eq(children.parentId, users.id))
      .where(and(...conditions))
      .orderBy(children.firstName);

    // Filter by search in application code since we need to search across joined fields
    if (data.search && data.search.trim()) {
      const term = data.search.toLowerCase();
      return results.filter(
        (r) =>
          r.childFirstName.toLowerCase().includes(term) ||
          r.childLastName.toLowerCase().includes(term)
      );
    }

    return results;
  });

export const exportRosterCsv = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityStaffOrOwner(data.facilityId, session.user.id);

    const results = await db
      .select({
        childFirstName: children.firstName,
        childLastName: children.lastName,
        childDateOfBirth: children.dateOfBirth,
        childAllergies: children.allergies,
        childMedicalNotes: children.medicalNotes,
        childEmergencyContactName: children.emergencyContactName,
        childEmergencyContactPhone: children.emergencyContactPhone,
        scheduleType: enrollments.scheduleType,
        startDate: enrollments.startDate,
        parentName: users.name,
        parentEmail: users.email,
        parentPhone: users.phone,
      })
      .from(enrollments)
      .innerJoin(children, eq(enrollments.childId, children.id))
      .innerJoin(users, eq(children.parentId, users.id))
      .where(
        and(
          eq(enrollments.facilityId, data.facilityId),
          or(eq(enrollments.status, "active"), eq(enrollments.status, "approved"))
        )
      )
      .orderBy(children.firstName);

    const csvHeader =
      "First Name,Last Name,Date of Birth,Parent,Parent Email,Parent Phone,Schedule,Enrolled Since,Allergies,Medical Notes,Emergency Contact,Emergency Phone";
    const csvRows = results.map((r) =>
      [
        r.childFirstName,
        r.childLastName,
        r.childDateOfBirth,
        r.parentName,
        r.parentEmail,
        r.parentPhone || "",
        r.scheduleType,
        r.startDate || "",
        (r.childAllergies || "").replace(/,/g, ";"),
        (r.childMedicalNotes || "").replace(/,/g, ";"),
        r.childEmergencyContactName || "",
        r.childEmergencyContactPhone || "",
      ].join(",")
    );

    return [csvHeader, ...csvRows].join("\n");
  });
