import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useChild, useDeleteChild } from "@daycare-hub/hooks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_parent/parent/children/$childId"
)({
  component: ChildDetailPage,
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

function ChildDetailPage() {
  const { childId } = Route.useParams();
  const { data: child, isLoading } = useChild(childId);
  const deleteChildMutation = useDeleteChild();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  if (!child) return null;

  async function handleDelete() {
    setDeleteError("");
    try {
      await deleteChildMutation.mutateAsync(childId);
      navigate({ to: "/parent/children" });
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {child.firstName} {child.lastName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Age {calculateAge(child.dateOfBirth)}
            {child.gender && ` · ${child.gender}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link
              to="/parent/children/$childId/activities"
              params={{ childId: child.id }}
            >
              Activities
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link
              to="/parent/children/$childId/photos"
              params={{ childId: child.id }}
            >
              Photos
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link
              to="/parent/children/$childId/edit"
              params={{ childId: child.id }}
            >
              Edit
            </Link>
          </Button>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Child Profile</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {child.firstName}'s profile?
                  This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteChildMutation.isPending}
                >
                  {deleteChildMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {new Date(child.dateOfBirth).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            {child.gender && (
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">{child.gender}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Allergies</p>
              <p className="font-medium">{child.allergies || "None listed"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Medical Notes</p>
              <p className="font-medium">
                {child.medicalNotes || "None listed"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">
                {child.emergencyContactName || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">
                {child.emergencyContactPhone || "Not provided"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enrollment History */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Enrollments</h2>
        {child.enrollments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No enrollments yet.</p>
              <Button variant="outline" asChild className="mt-4">
                <Link to="/discover">Find a Daycare</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {child.enrollments.map((enrollment) => (
              <Link
                key={enrollment.id}
                to="/parent/enrollments/$enrollmentId"
                params={{ enrollmentId: enrollment.id }}
                className="block"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {enrollment.scheduleType.replace("_", " ")}
                      </p>
                      <Badge
                        variant={
                          enrollment.status === "active"
                            ? "default"
                            : enrollment.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {enrollment.status}
                      </Badge>
                    </div>
                    {enrollment.startDate && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Started {enrollment.startDate}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
