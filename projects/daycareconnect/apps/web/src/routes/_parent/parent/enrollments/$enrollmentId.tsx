import { createFileRoute, Link } from "@tanstack/react-router";
import { useEnrollment, useEnrollmentHistory, useWithdrawEnrollment } from "@daycare-hub/hooks";
import { StatusTimeline } from "@/components/enrollment/status-timeline";
import { WithdrawDialog } from "@/components/enrollment/withdraw-dialog";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_parent/parent/enrollments/$enrollmentId"
)({
  component: EnrollmentDetailPage,
});

function statusBadgeVariant(status: string) {
  switch (status) {
    case "active":
    case "approved":
      return "default";
    case "pending":
      return "secondary";
    case "withdrawn":
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
}

function EnrollmentDetailPage() {
  const { enrollmentId } = Route.useParams();
  const { data: enrollment, isLoading: enrollmentLoading } = useEnrollment(enrollmentId);
  const { data: history, isLoading: historyLoading } = useEnrollmentHistory(enrollmentId);
  const withdrawMutation = useWithdrawEnrollment();

  const isLoading = enrollmentLoading || historyLoading;

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  if (!enrollment) return null;

  async function handleWithdraw(reason?: string) {
    await withdrawMutation.mutateAsync({
      enrollmentId: enrollment!.id,
      reason,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enrollment Details</h1>
          <p className="mt-1 text-muted-foreground">
            {enrollment.childFirstName} {enrollment.childLastName} at{" "}
            {enrollment.facilityName}
          </p>
        </div>
        {enrollment.status !== "withdrawn" &&
          enrollment.status !== "rejected" && (
            <WithdrawDialog onConfirm={handleWithdraw} />
          )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={statusBadgeVariant(enrollment.status) as any}>
                {enrollment.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Schedule Type</p>
              <p className="font-medium capitalize">
                {enrollment.scheduleType.replace("_", " ")}
              </p>
            </div>
            {enrollment.startDate && (
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{enrollment.startDate}</p>
              </div>
            )}
            {enrollment.endDate && (
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{enrollment.endDate}</p>
              </div>
            )}
            {enrollment.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{enrollment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Child</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <Link
                to="/parent/children/$childId"
                params={{ childId: enrollment.childId }}
                className="font-medium text-primary hover:underline"
              >
                {enrollment.childFirstName} {enrollment.childLastName}
              </Link>
            </div>
            {enrollment.childDateOfBirth && (
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {new Date(enrollment.childDateOfBirth).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <Link
                to="/facilities/$facilityId"
                params={{ facilityId: enrollment.facilityId }}
                className="font-medium text-primary hover:underline"
              >
                {enrollment.facilityName}
              </Link>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">
                {enrollment.facilityAddress}, {enrollment.facilityCity},{" "}
                {enrollment.facilityState}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{enrollment.facilityPhone}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status History</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusTimeline history={history ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
