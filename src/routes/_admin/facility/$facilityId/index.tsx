import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getFacility, updateFacility } from "@/server/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_admin/facility/$facilityId/")({
  component: FacilityOverview,
});

function FacilityOverview() {
  const { facilityId } = useParams({
    from: "/_admin/facility/$facilityId/",
  });
  const [facility, setFacility] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFacility({ data: { facilityId } }).then((data) => {
      setFacility(data);
      setLoading(false);
    });
  }, [facilityId]);

  if (loading || !facility) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);

    const updated = await updateFacility({
      data: {
        facilityId,
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || undefined,
        address: (formData.get("address") as string) || undefined,
        city: (formData.get("city") as string) || undefined,
        state: (formData.get("state") as string) || undefined,
        zipCode: (formData.get("zipCode") as string) || undefined,
        phone: (formData.get("phone") as string) || undefined,
        email: (formData.get("email") as string) || undefined,
      },
    });

    setFacility(updated);
    setEditing(false);
    setSaving(false);
  }

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Facility</CardTitle>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" defaultValue={facility.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={facility.description || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={facility.address || ""} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={facility.city || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" defaultValue={facility.state || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip</Label>
                <Input id="zipCode" name="zipCode" defaultValue={facility.zipCode || ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={facility.phone || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" defaultValue={facility.email || ""} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{facility.name}</CardTitle>
            <Badge variant={facility.isActive ? "default" : "secondary"} className="mt-2">
              {facility.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {facility.description && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p className="text-sm">{facility.description}</p>
          </div>
        )}
        {(facility.address || facility.city) && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Address</p>
            <p className="text-sm">
              {[facility.address, facility.city, facility.state, facility.zipCode]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        )}
        {facility.phone && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Phone</p>
            <p className="text-sm">{facility.phone}</p>
          </div>
        )}
        {facility.email && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-sm">{facility.email}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
