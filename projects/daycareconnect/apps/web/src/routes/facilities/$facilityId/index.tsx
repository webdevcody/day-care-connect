import { createFileRoute, Link } from "@tanstack/react-router";
import { useFacility } from "@daycare-hub/hooks";
import { PhotoCarousel } from "@/components/facility/photo-carousel";
import { HoursTable } from "@/components/facility/hours-table";
import { PricingCards } from "@/components/facility/pricing-cards";
import { StaffGrid } from "@/components/facility/staff-grid";
import { ServiceTags } from "@/components/facility/service-tags";
import { APP_NAME } from "@daycare-hub/shared";
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@daycare-hub/ui";

export const Route = createFileRoute("/facilities/$facilityId/")({
  component: FacilityProfilePage,
});

function FacilityProfilePage() {
  const { facilityId } = Route.useParams();
  const { data: facility, isLoading } = useFacility(facilityId);

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );

  if (!facility) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="text-xl font-bold text-primary">
            {APP_NAME}
          </a>
          <Link to="/facilities" className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to Facilities
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <PhotoCarousel photos={facility.photos} />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">{facility.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {facility.address}, {facility.city}, {facility.state} {facility.zipCode}
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{facility.phone}</span>
            {facility.email && <span> &middot; {facility.email}</span>}
            {facility.website && (
              <>
                <span> &middot; </span>
                <a
                  href={facility.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Website
                </a>
              </>
            )}
          </div>
          <div className="mt-4">
            <Button asChild size="lg">
              <Link to="/facilities/$facilityId/enroll" params={{ facilityId: facility.id }}>
                Apply for Enrollment
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="hours-pricing">Hours & Pricing</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {facility.description && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {facility.description}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Capacity</p>
                    <p className="font-medium">{facility.capacity} children</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Age Range</p>
                    <p className="font-medium">
                      {facility.ageRangeMin}–{facility.ageRangeMax} years
                    </p>
                  </div>
                  {facility.licenseNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">License</p>
                      <p className="font-medium">{facility.licenseNumber}</p>
                    </div>
                  )}
                  {facility.licensingAuthority && (
                    <div>
                      <p className="text-sm text-muted-foreground">Licensed By</p>
                      <p className="font-medium">{facility.licensingAuthority}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {facility.services.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <ServiceTags services={facility.services} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="hours-pricing" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Operating Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <HoursTable hours={facility.hours} />
              </CardContent>
            </Card>

            <div>
              <h3 className="mb-4 text-lg font-semibold">Pricing</h3>
              <PricingCards
                hourlyRate={facility.hourlyRate}
                dailyRate={facility.dailyRate}
                weeklyRate={facility.weeklyRate}
                monthlyRate={facility.monthlyRate}
              />
            </div>
          </TabsContent>

          <TabsContent value="staff" className="mt-6">
            <StaffGrid staff={facility.staff} />
          </TabsContent>

          <TabsContent value="photos" className="mt-6">
            {facility.photos.length === 0 ? (
              <p className="text-muted-foreground">No photos available.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {facility.photos.map((photo: any) => (
                  <img
                    key={photo.id}
                    src={photo.url}
                    alt={photo.altText || "Facility photo"}
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
