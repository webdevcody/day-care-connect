import { Hono } from "hono";
import {
  db,
  enrollments,
  children,
  users,
  eq,
  and,
  or,
} from "@daycare-hub/db";
import { assertFacilityPermission } from "../../lib/facility-auth";

const app = new Hono();

// GET /:facilityId - Get facility roster
app.get("/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");
  const search = c.req.query("search");

  await assertFacilityPermission(facilityId, userId, "roster:view");

  const conditions = [
    eq(enrollments.facilityId, facilityId),
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
  if (search && search.trim()) {
    const term = search.toLowerCase();
    const filtered = results.filter(
      (r) =>
        r.childFirstName.toLowerCase().includes(term) ||
        r.childLastName.toLowerCase().includes(term)
    );
    return c.json(filtered);
  }

  return c.json(results);
});

// GET /:facilityId/export - Export roster as CSV
app.get("/:facilityId/export", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "roster:view");

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
        eq(enrollments.facilityId, facilityId),
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

  const csv = [csvHeader, ...csvRows].join("\n");

  return c.json(csv);
});

export { app as adminRosterRoutes };
