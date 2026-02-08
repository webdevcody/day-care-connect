import { createFileRoute, Link } from "@tanstack/react-router";
import { useDashboard } from "@daycare-hub/hooks";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@daycare-hub/ui";
import { ActivityIcon, getActivityLabel } from "@/components/activities/activity-icon";
import type { ActivityType } from "@daycare-hub/shared";

export const Route = createFileRoute("/_parent/parent/")({
  component: DashboardPage,
});

function calculateAge(dateOfBirth: string) {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function DashboardPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Overview of your children and enrollments.</p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/parent/children/new">Add Child</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/discover">Find Daycare</Link>
        </Button>
      </div>

      {/* My Children */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Children</h2>
          <Link to="/parent/children" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {(data?.children?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No children added yet.</p>
              <Button asChild className="mt-4">
                <Link to="/parent/children/new">Add Your First Child</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.children ?? []).map((child) => (
              <Link
                key={child.id}
                to="/parent/children/$childId"
                params={{ childId: child.id }}
                className="block"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="pt-6">
                    <p className="font-semibold">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Age {calculateAge(child.dateOfBirth)}
                      {child.gender && ` · ${child.gender}`}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activities */}
      {(data?.recentActivities?.length ?? 0) > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Recent Activities</h2>
          <div className="space-y-3">
            {(data?.recentActivities ?? []).map((activity) => (
              <Link
                key={activity.id}
                to="/parent/children/$childId/activities"
                params={{ childId: activity.childId }}
                className="block"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <ActivityIcon type={activity.type as ActivityType} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {getActivityLabel(activity.type as ActivityType)}{" "}
                        <span className="text-muted-foreground">
                          — {activity.childFirstName} {activity.childLastName}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.facilityName} · {new Date(activity.occurredAt).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Daily Reports */}
      {(data?.recentReports?.length ?? 0) > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Recent Daily Reports</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(data?.recentReports ?? []).map((report) => (
              <Link
                key={report.id}
                to="/parent/children/$childId/daily-report/$date"
                params={{ childId: report.childId, date: report.date }}
                className="block"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="pt-6">
                    <p className="font-semibold">
                      {report.childFirstName} {report.childLastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(report.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{report.facilityName}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active Enrollments */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Active Enrollments</h2>
        {(data?.activeEnrollments?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No active enrollments.</p>
              <Button variant="outline" asChild className="mt-4">
                <Link to="/discover">Find a Daycare</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(data?.activeEnrollments ?? []).map((enrollment) => (
              <Link
                key={enrollment.id}
                to="/parent/enrollments/$enrollmentId"
                params={{ enrollmentId: enrollment.id }}
                className="block"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">
                          {enrollment.childFirstName} {enrollment.childLastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{enrollment.facilityName}</p>
                      </div>
                      <Badge>{enrollment.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {enrollment.scheduleType.replace("_", " ")}
                      {enrollment.startDate && ` · Started ${enrollment.startDate}`}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pending Applications */}
      {(data?.pendingEnrollments?.length ?? 0) > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Pending Applications</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(data?.pendingEnrollments ?? []).map((enrollment) => (
              <Link
                key={enrollment.id}
                to="/parent/enrollments/$enrollmentId"
                params={{ enrollmentId: enrollment.id }}
                className="block"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">
                          {enrollment.childFirstName} {enrollment.childLastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{enrollment.facilityName}</p>
                      </div>
                      <Badge variant="secondary">{enrollment.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Applied {new Date(enrollment.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
