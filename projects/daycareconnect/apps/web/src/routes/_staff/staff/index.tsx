import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { db, facilityStaff, facilities, eq } from "@daycare-hub/db";
import { Card, CardContent, CardHeader, CardTitle } from "@daycare-hub/ui";
import { Building2, MapPin } from "lucide-react";

const getStaffAssignments = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const assignments = await db
      .select({
        id: facilityStaff.id,
        staffRole: facilityStaff.staffRole,
        facilityId: facilities.id,
        facilityName: facilities.name,
        facilityAddress: facilities.address,
        facilityCity: facilities.city,
        facilityState: facilities.state,
      })
      .from(facilityStaff)
      .innerJoin(facilities, eq(facilityStaff.facilityId, facilities.id))
      .where(eq(facilityStaff.userId, session.user.id));

    return assignments;
  }
);

export const Route = createFileRoute("/_staff/staff/")({
  component: StaffDashboard,
});

function StaffDashboard() {
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["staff-assignments"],
    queryFn: () => getStaffAssignments(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Assignments</h1>
        <p className="mt-1 text-muted-foreground">
          Facilities where you are assigned as staff.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      ) : assignments && assignments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base">
                    {assignment.facilityName}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {assignment.facilityAddress}, {assignment.facilityCity},{" "}
                      {assignment.facilityState}
                    </span>
                  </div>
                  <div>
                    <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {assignment.staffRole.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            You are not currently assigned to any facilities.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
