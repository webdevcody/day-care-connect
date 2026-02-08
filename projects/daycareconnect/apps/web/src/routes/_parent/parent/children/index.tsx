import { createFileRoute, Link } from "@tanstack/react-router";
import { useChildren } from "@daycare-hub/hooks";
import { Card, CardContent, Badge, Button } from "@daycare-hub/ui";

export const Route = createFileRoute("/_parent/parent/children/")({
  component: ChildrenListPage,
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

function ChildrenListPage() {
  const { data, isLoading } = useChildren();

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  const children = Array.isArray(data) ? data : (data?.children ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Children</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your children's profiles.
          </p>
        </div>
        <Button asChild>
          <Link to="/parent/children/new">Add Child</Link>
        </Button>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No children added yet.</p>
            <Button asChild className="mt-4">
              <Link to="/parent/children/new">Add Your First Child</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Link
              key={child.id}
              to="/parent/children/$childId"
              params={{ childId: child.id }}
              className="block"
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <p className="text-lg font-semibold">
                    {child.firstName} {child.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Age {calculateAge(child.dateOfBirth)}
                    {child.gender && ` · ${child.gender}`}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {child.activeEnrollments > 0 && (
                      <Badge>
                        {child.activeEnrollments} active
                      </Badge>
                    )}
                    {child.pendingEnrollments > 0 && (
                      <Badge variant="secondary">
                        {child.pendingEnrollments} pending
                      </Badge>
                    )}
                    {child.activeEnrollments === 0 && child.pendingEnrollments === 0 && (
                      <Badge variant="outline">No enrollments</Badge>
                    )}
                  </div>
                  {child.allergies && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Allergies: {child.allergies}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
