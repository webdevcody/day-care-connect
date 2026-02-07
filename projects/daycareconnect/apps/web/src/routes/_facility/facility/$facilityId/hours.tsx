import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getFacility } from "@/lib/server/facilities";
import { updateFacilityHours } from "@/lib/server/facility-hours";
import { FacilitySubNav } from "@/components/admin/facility-sub-nav";
import { DAYS_OF_WEEK } from "@daycare-hub/shared";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/hours"
)({
  loader: ({ params }) => getFacility({ data: { facilityId: params.facilityId } }),
  component: FacilityHoursPage,
});

type DaySchedule = {
  closed: boolean;
  openTime: string;
  closeTime: string;
};

function FacilityHoursPage() {
  const facility = Route.useLoaderData();
  const { facilityId } = Route.useParams();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const initial: DaySchedule[] = DAYS_OF_WEEK.map((_, i) => {
    const existing = facility.hours.find((h) => h.dayOfWeek === i);
    if (existing) {
      return { closed: false, openTime: existing.openTime.slice(0, 5), closeTime: existing.closeTime.slice(0, 5) };
    }
    return { closed: true, openTime: "07:00", closeTime: "18:00" };
  });

  const [schedule, setSchedule] = useState<DaySchedule[]>(initial);

  const updateDay = (index: number, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule((prev) =>
      prev.map((day, i) => (i === index ? { ...day, [field]: value } : day))
    );
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const hours = schedule
        .map((day, i) =>
          day.closed ? null : { dayOfWeek: i, openTime: day.openTime, closeTime: day.closeTime }
        )
        .filter(Boolean) as Array<{ dayOfWeek: number; openTime: string; closeTime: string }>;

      await updateFacilityHours({ data: { facilityId, hours } });
      router.invalidate();
    } catch (err: any) {
      setError(err.message || "Failed to update hours");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <FacilitySubNav facilityId={facilityId} />
      <h1 className="mb-6 text-2xl font-bold">Operating Hours</h1>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((day, i) => (
            <div key={day} className="flex items-center gap-4">
              <span className="w-24 text-sm font-medium">{day}</span>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={schedule[i].closed}
                  onChange={(e) => updateDay(i, "closed", e.target.checked)}
                  className="rounded"
                />
                Closed
              </label>
              {!schedule[i].closed && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="sr-only">Open</Label>
                    <Input
                      type="time"
                      className="w-32"
                      value={schedule[i].openTime}
                      onChange={(e) => updateDay(i, "openTime", e.target.value)}
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      className="w-32"
                      value={schedule[i].closeTime}
                      onChange={(e) => updateDay(i, "closeTime", e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Hours"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
