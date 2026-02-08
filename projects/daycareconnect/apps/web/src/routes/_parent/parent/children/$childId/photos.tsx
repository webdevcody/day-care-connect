import { createFileRoute, Link } from "@tanstack/react-router";
import { useChildPhotos } from "@daycare-hub/hooks";
import { Card, CardContent, Button, Input, Label } from "@daycare-hub/ui";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute(
  "/_parent/parent/children/$childId/photos"
)({
  component: ChildPhotosPage,
});

function ChildPhotosPage() {
  const { childId } = Route.useParams();
  const { data: photos, isLoading } = useChildPhotos(childId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link
            to="/parent/children/$childId"
            params={{ childId }}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Photos</h1>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading photos...</p>
          </CardContent>
        </Card>
      ) : !photos || photos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No photos found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos
            .filter((p: any) => p.photoUrl)
            .map((photo: any) => (
              <div key={photo.id} className="group relative">
                <img
                  src={photo.photoUrl}
                  alt="Activity photo"
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/50 p-2">
                  <p className="text-xs text-white">
                    {new Date(photo.occurredAt).toLocaleDateString()}
                  </p>
                  {photo.facilityName && (
                    <p className="text-xs text-white/70">
                      {photo.facilityName}
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
