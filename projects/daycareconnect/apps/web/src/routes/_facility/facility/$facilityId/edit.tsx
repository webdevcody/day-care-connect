import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getFacility, updateFacility, toggleFacilityStatus } from "@/lib/server/facilities";
import { FacilitySubNav } from "@/components/admin/facility-sub-nav";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Badge,
} from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/edit"
)({
  loader: ({ params }) => getFacility({ data: { facilityId: params.facilityId } }),
  component: EditFacilityPage,
});

function EditFacilityPage() {
  const facility = Route.useLoaderData();
  const { facilityId } = Route.useParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: facility.name,
    description: facility.description || "",
    phone: facility.phone,
    email: facility.email || "",
    website: facility.website || "",
    address: facility.address,
    city: facility.city,
    state: facility.state,
    zipCode: facility.zipCode,
    capacity: facility.capacity,
    ageRangeMin: facility.ageRangeMin,
    ageRangeMax: facility.ageRangeMax,
    monthlyRate: facility.monthlyRate || "",
    hourlyRate: facility.hourlyRate || "",
    dailyRate: facility.dailyRate || "",
    weeklyRate: facility.weeklyRate || "",
    licenseNumber: facility.licenseNumber || "",
    licenseExpiry: facility.licenseExpiry || "",
    licensingAuthority: facility.licensingAuthority || "",
  });

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      await updateFacility({ data: { facilityId, ...form } });
      router.invalidate();
    } catch (err: any) {
      setError(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    try {
      await toggleFacilityStatus({ data: { facilityId } });
      router.invalidate();
    } catch (err: any) {
      setError(err.message || "Failed to toggle status");
    }
  };

  return (
    <div>
      <FacilitySubNav facilityId={facilityId} />

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{facility.name}</h1>
        <div className="flex items-center gap-3">
          <Badge variant={facility.isActive ? "default" : "secondary"}>
            {facility.isActive ? "Active" : "Inactive"}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleToggle}>
            {facility.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Facility Name</Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" type="url" value={form.website} onChange={(e) => update("website", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Street Address</Label>
            <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} onChange={(e) => update("state", e.target.value.toUpperCase().slice(0, 2))} maxLength={2} />
            </div>
            <div>
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input id="zipCode" value={form.zipCode} onChange={(e) => update("zipCode", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Capacity & Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" type="number" min={1} value={form.capacity} onChange={(e) => update("capacity", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label htmlFor="ageRangeMin">Min Age</Label>
              <Input id="ageRangeMin" type="number" min={0} value={form.ageRangeMin} onChange={(e) => update("ageRangeMin", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label htmlFor="ageRangeMax">Max Age</Label>
              <Input id="ageRangeMax" type="number" min={0} value={form.ageRangeMax} onChange={(e) => update("ageRangeMax", parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input id="hourlyRate" value={form.hourlyRate} onChange={(e) => update("hourlyRate", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dailyRate">Daily Rate ($)</Label>
              <Input id="dailyRate" value={form.dailyRate} onChange={(e) => update("dailyRate", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="weeklyRate">Weekly Rate ($)</Label>
              <Input id="weeklyRate" value={form.weeklyRate} onChange={(e) => update("weeklyRate", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="monthlyRate">Monthly Rate ($)</Label>
              <Input id="monthlyRate" value={form.monthlyRate} onChange={(e) => update("monthlyRate", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Licensing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input id="licenseNumber" value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="licenseExpiry">Expiry Date</Label>
              <Input id="licenseExpiry" type="date" value={form.licenseExpiry} onChange={(e) => update("licenseExpiry", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="licensingAuthority">Authority</Label>
              <Input id="licensingAuthority" value={form.licensingAuthority} onChange={(e) => update("licensingAuthority", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
