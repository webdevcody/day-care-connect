import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useActiveFacilities } from "@daycare-hub/hooks";
import { APP_NAME } from "@daycare-hub/shared";
import { Card, CardContent, CardHeader, CardTitle, Input, Badge } from "@daycare-hub/ui";

export const Route = createFileRoute("/facilities/")({
  component: FacilitiesBrowsePage,
});

function FacilitiesBrowsePage() {
  const { data: facilities, isLoading } = useActiveFacilities();
  const [filter, setFilter] = useState("");

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  const allFacilities = facilities ?? [];

  const filtered = allFacilities.filter((f: any) => {
    const search = filter.toLowerCase();
    return (
      f.name.toLowerCase().includes(search) ||
      f.city.toLowerCase().includes(search) ||
      f.state.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="text-xl font-bold text-primary">{APP_NAME}</a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Browse Facilities</h1>
          <p className="mt-2 text-muted-foreground">
            Find the perfect daycare for your child.
          </p>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Search by name, city, or state..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-md"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground">No facilities found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((facility: any) => (
              <Link
                key={facility.id}
                to="/facilities/$facilityId"
                params={{ facilityId: facility.id }}
                className="block"
              >
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  {facility.photos[0] ? (
                    <img
                      src={facility.photos[0].url}
                      alt={facility.photos[0].altText || facility.name}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-muted">
                      <span className="text-muted-foreground">No photo</span>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">{facility.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {facility.city}, {facility.state}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span>Capacity: {facility.capacity}</span>
                      {facility.monthlyRate && (
                        <span className="font-medium">${facility.monthlyRate}/mo</span>
                      )}
                    </div>
                    {facility.services.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {facility.services.slice(0, 3).map((s: any) => (
                          <Badge key={s.id} variant="secondary" className="text-xs">
                            {s.serviceName}
                          </Badge>
                        ))}
                        {facility.services.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{facility.services.length - 3}
                          </Badge>
                        )}
                      </div>
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
