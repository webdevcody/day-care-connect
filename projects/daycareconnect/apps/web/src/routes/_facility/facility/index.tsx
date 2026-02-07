import { createFileRoute, Link } from "@tanstack/react-router";
import { getMyFacilities } from "@/lib/server/facilities";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@daycare-hub/ui";

export const Route = createFileRoute("/_facility/facility/")({
  loader: () => getMyFacilities(),
  component: FacilitiesListPage,
});

function FacilitiesListPage() {
  const facilities = Route.useLoaderData();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Facilities</h1>
        <Link to="/facility/new">
          <Button>Create Facility</Button>
        </Link>
      </div>

      {facilities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You haven't created any facilities yet.
            </p>
            <Link to="/facility/new" className="mt-4 inline-block">
              <Button>Create Your First Facility</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility) => (
            <Link
              key={facility.id}
              to="/facility/$facilityId"
              params={{ facilityId: facility.id }}
              className="block"
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{facility.name}</CardTitle>
                    <Badge variant={facility.isActive ? "default" : "secondary"}>
                      {facility.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {facility.address}, {facility.city}, {facility.state} {facility.zipCode}
                  </p>
                  <p className="mt-2 text-sm">
                    Capacity: <span className="font-medium">{facility.capacity}</span>
                  </p>
                  {facility.monthlyRate && (
                    <p className="text-sm">
                      Monthly Rate: <span className="font-medium">${facility.monthlyRate}</span>
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
