import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminDashboard } from "@daycare-hub/hooks";
import { AdminFacilityNav } from "@/components/admin/admin-facility-nav";
import { EnrollmentStatusBadge } from "@/components/admin/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/"
)({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { facilityId } = Route.useParams();
  const { data, isLoading } = useAdminDashboard(facilityId);

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  const { facility, enrollmentCounts, attendanceCounts, pendingEnrollments } = data!;

  const activeEnrollments = enrollmentCounts["active"] ?? 0;
  const pendingCount = enrollmentCounts["pending"] ?? 0;
  const presentCount = attendanceCounts["present"] ?? 0;
  const absentCount = attendanceCounts["absent"] ?? 0;
  const expectedCount = attendanceCounts["expected"] ?? 0;
  const lateCount = attendanceCounts["late"] ?? 0;
  const totalAttendance = presentCount + absentCount + expectedCount + lateCount;

  return (
    <div>
      <AdminFacilityNav facilityId={facilityId} />

      <h1 className="mb-6 text-2xl font-bold">{facility.name} — Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {presentCount + lateCount} / {totalAttendance}
            </div>
            <p className="text-xs text-muted-foreground">
              {absentCount} absent, {expectedCount} expected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Enrollments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEnrollments}</div>
            <p className="text-xs text-muted-foreground">enrolled children</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeEnrollments} / {facility.capacity}
            </div>
            <p className="text-xs text-muted-foreground">
              {facility.capacity - activeEnrollments} spots available
            </p>
          </CardContent>
        </Card>
      </div>

      {pendingEnrollments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending Applications</CardTitle>
              <Link
                to="/facility/$facilityId/enrollments"
                params={{ facilityId }}
                search={{ status: "pending" }}
              >
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingEnrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {enrollment.childFirstName} {enrollment.childLastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Parent: {enrollment.parentName} &middot;{" "}
                      {enrollment.scheduleType.replace("_", " ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <EnrollmentStatusBadge status="pending" />
                    <Link
                      to="/facility/$facilityId/enrollments"
                      params={{ facilityId }}
                      search={{ status: "pending" }}
                    >
                      <Button variant="outline" size="sm">
                        Review
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
