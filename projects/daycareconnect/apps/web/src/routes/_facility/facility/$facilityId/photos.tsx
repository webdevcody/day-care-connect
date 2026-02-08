import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useFacility,
  useAddFacilityPhoto,
  useDeleteFacilityPhoto,
  useReorderFacilityPhotos,
} from "@daycare-hub/hooks";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@daycare-hub/ui";

export const Route = createFileRoute("/_facility/facility/$facilityId/photos")({
  component: FacilityPhotosPage,
});

function FacilityPhotosPage() {
  const { facilityId } = Route.useParams();
  const { data: facility, isLoading } = useFacility(facilityId);
  const addFacilityPhoto = useAddFacilityPhoto();
  const deleteFacilityPhoto = useDeleteFacilityPhoto();
  const reorderFacilityPhotos = useReorderFacilityPhotos();
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [adding, setAdding] = useState(false);

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  if (!facility) return null;

  const handleAdd = async () => {
    if (!url) return;
    setError("");
    setAdding(true);
    try {
      await addFacilityPhoto.mutateAsync({ facilityId, data: { url, altText } });
      setUrl("");
      setAltText("");
      setDialogOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to add photo");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("Delete this photo?")) return;
    try {
      await deleteFacilityPhoto.mutateAsync({ facilityId, photoId });
    } catch (err: any) {
      setError(err.message || "Failed to delete photo");
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const photos = [...facility.photos];
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    [photos[index], photos[target]] = [photos[target], photos[index]];
    try {
      await reorderFacilityPhotos.mutateAsync({ facilityId, photoIds: photos.map((p) => p.id) });
    } catch (err: any) {
      setError(err.message || "Failed to reorder");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Photos</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{facility.photos.length}/20</span>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={facility.photos.length >= 20}>Add Photo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Photo</DialogTitle>
                <DialogDescription>Upload a new photo for your facility.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="photo-url">Image URL *</Label>
                  <Input
                    id="photo-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="photo-alt">Alt Text</Label>
                  <Input
                    id="photo-alt"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Description of the image"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={handleAdd} disabled={adding} className="w-full">
                  {adding ? "Adding..." : "Add Photo"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && !dialogOpen && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {facility.photos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No photos yet. Add your first photo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {facility.photos.map((photo, index) => (
            <Card key={photo.id}>
              <CardContent className="p-3">
                <img
                  src={photo.url}
                  alt={photo.altText || "Facility photo"}
                  className="mb-3 aspect-video w-full rounded-md object-cover"
                />
                {photo.altText && (
                  <p className="mb-2 text-sm text-muted-foreground">{photo.altText}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0}
                    >
                      &uarr;
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMove(index, 1)}
                      disabled={index === facility.photos.length - 1}
                    >
                      &darr;
                    </Button>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(photo.id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
