import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getFacility } from "@/lib/server/facilities";
import { updateFacilityServices } from "@/lib/server/facility-services";
import { FacilitySubNav } from "@/components/admin/facility-sub-nav";
import { FACILITY_SERVICES_SUGGESTIONS } from "@daycare-hub/shared";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
} from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/services"
)({
  loader: ({ params }) => getFacility({ data: { facilityId: params.facilityId } }),
  component: FacilityServicesPage,
});

function FacilityServicesPage() {
  const facility = Route.useLoaderData();
  const { facilityId } = Route.useParams();
  const router = useRouter();
  const [services, setServices] = useState<string[]>(
    facility.services.map((s) => s.serviceName)
  );
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (name: string) => {
    setServices((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const addCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed || services.includes(trimmed)) return;
    setServices((prev) => [...prev, trimmed]);
    setCustom("");
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      await updateFacilityServices({ data: { facilityId, services } });
      router.invalidate();
    } catch (err: any) {
      setError(err.message || "Failed to save services");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <FacilitySubNav facilityId={facilityId} />
      <h1 className="mb-6 text-2xl font-bold">Services</h1>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Current Services</CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services selected.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {services.map((s) => (
                <Badge key={s} variant="default" className="cursor-pointer gap-1" onClick={() => toggle(s)}>
                  {s} &times;
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Suggested Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {FACILITY_SERVICES_SUGGESTIONS.map((s) => (
              <Badge
                key={s}
                variant={services.includes(s) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggle(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Custom Service</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Enter a custom service"
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
            />
            <Button variant="outline" onClick={addCustom}>
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Services"}
        </Button>
      </div>
    </div>
  );
}
