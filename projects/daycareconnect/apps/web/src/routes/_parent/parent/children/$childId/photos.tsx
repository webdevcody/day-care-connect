import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getChildPhotos } from "@/lib/server/parent-activities";
import { Card, CardContent, Button, Input, Label } from "@daycare-hub/ui";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute(
  "/_parent/parent/children/$childId/photos"
)({
  component: ChildPhotosPage,
});

function ChildPhotosPage() {
  const { childId } = Route.useParams();
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const data = await getChildPhotos({
        data: {
          childId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      setPhotos(data);
    } catch (err) {
      console.error("Failed to fetch photos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [childId, startDate, endDate]);

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

      {/* Date filter */}
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="startDate" className="text-sm">From</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-auto"
          />
        </div>
        <div>
          <Label htmlFor="endDate" className="text-sm">To</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-auto"
          />
        </div>
        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading photos...</p>
          </CardContent>
        </Card>
      ) : photos.length === 0 ? (
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
