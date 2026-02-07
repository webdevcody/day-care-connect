import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createFacility } from "@/lib/server/facilities";
import { createFacilitySchema } from "@daycare-hub/shared";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  cn,
} from "@daycare-hub/ui";

export const Route = createFileRoute("/_facility/facility/new")({
  component: CreateFacilityPage,
});

const STEPS = ["basic", "address", "pricing", "licensing", "review"] as const;
type Step = (typeof STEPS)[number];

function CreateFacilityPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("basic");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    capacity: 20,
    ageRangeMin: 0,
    ageRangeMax: 12,
    monthlyRate: "",
    hourlyRate: "",
    dailyRate: "",
    weeklyRate: "",
    licenseNumber: "",
    licenseExpiry: "",
    licensingAuthority: "",
  });

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const goTo = (s: Step) => {
    setError("");
    setStep(s);
  };

  const handleSubmit = async () => {
    setError("");
    const parsed = createFacilitySchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const facility = await createFacility({ data: form });
      navigate({
        to: "/facility/$facilityId/edit",
        params: { facilityId: facility.id },
      });
    } catch (err: any) {
      setError(err.message || "Failed to create facility");
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = STEPS.indexOf(step);

  const STEP_LABELS: Record<Step, string> = {
    basic: "Basic Info",
    address: "Address",
    pricing: "Capacity & Pricing",
    licensing: "Licensing",
    review: "Review",
  };

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="mb-2 text-3xl font-bold">Create Facility</h1>
      <p className="mb-8 text-muted-foreground">
        Step {stepIndex + 1} of {STEPS.length} — {STEP_LABELS[step]}
      </p>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <button
              onClick={() => goTo(s)}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors",
                i < stepIndex
                  ? "bg-primary text-primary-foreground"
                  : i === stepIndex
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {i < stepIndex ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              ) : (
                i + 1
              )}
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1",
                  i < stepIndex ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Basic Info */}
      {step === "basic" && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Facility Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Sunshine Daycare Center" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Tell parents about your facility..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="contact@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://" />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => goTo("address")}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address */}
      {step === "address" && (
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address *</Label>
              <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Main Street" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Springfield" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input id="state" value={form.state} onChange={(e) => update("state", e.target.value.toUpperCase().slice(0, 2))} maxLength={2} placeholder="CA" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code *</Label>
                <Input id="zipCode" value={form.zipCode} onChange={(e) => update("zipCode", e.target.value)} placeholder="90210" />
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => goTo("basic")}>Back</Button>
              <Button onClick={() => goTo("pricing")}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capacity & Pricing */}
      {step === "pricing" && (
        <Card>
          <CardHeader>
            <CardTitle>Capacity & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <Input id="capacity" type="number" min={1} value={form.capacity} onChange={(e) => update("capacity", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ageRangeMin">Min Age</Label>
                <Input id="ageRangeMin" type="number" min={0} value={form.ageRangeMin} onChange={(e) => update("ageRangeMin", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ageRangeMax">Max Age</Label>
                <Input id="ageRangeMax" type="number" min={0} value={form.ageRangeMax} onChange={(e) => update("ageRangeMax", parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium">Pricing (optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input id="hourlyRate" value={form.hourlyRate} onChange={(e) => update("hourlyRate", e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyRate">Daily Rate ($)</Label>
                  <Input id="dailyRate" value={form.dailyRate} onChange={(e) => update("dailyRate", e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weeklyRate">Weekly Rate ($)</Label>
                  <Input id="weeklyRate" value={form.weeklyRate} onChange={(e) => update("weeklyRate", e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyRate">Monthly Rate ($)</Label>
                  <Input id="monthlyRate" value={form.monthlyRate} onChange={(e) => update("monthlyRate", e.target.value)} placeholder="0.00" />
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => goTo("address")}>Back</Button>
              <Button onClick={() => goTo("licensing")}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Licensing */}
      {step === "licensing" && (
        <Card>
          <CardHeader>
            <CardTitle>Licensing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input id="licenseNumber" value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} placeholder="e.g. DCC-2024-12345" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseExpiry">License Expiry</Label>
                <Input id="licenseExpiry" type="date" value={form.licenseExpiry} onChange={(e) => update("licenseExpiry", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licensingAuthority">Licensing Authority</Label>
                <Input id="licensingAuthority" value={form.licensingAuthority} onChange={(e) => update("licensingAuthority", e.target.value)} placeholder="e.g. State Dept. of Education" />
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => goTo("pricing")}>Back</Button>
              <Button onClick={() => goTo("review")}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review */}
      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Basic Info</h3>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{form.name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="font-medium">{form.phone || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-medium">{form.email || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Website</dt>
                    <dd className="font-medium">{form.website || "—"}</dd>
                  </div>
                </dl>
                {form.description && (
                  <div className="mt-3 text-sm">
                    <dt className="text-muted-foreground">Description</dt>
                    <dd className="mt-1">{form.description}</dd>
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Address</h3>
                <p className="text-sm font-medium">
                  {form.address}{form.city && `, ${form.city}`}{form.state && `, ${form.state}`} {form.zipCode}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Capacity & Pricing</h3>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Capacity</dt>
                    <dd className="font-medium">{form.capacity}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Age Range</dt>
                    <dd className="font-medium">{form.ageRangeMin}–{form.ageRangeMax} years</dd>
                  </div>
                  {form.hourlyRate && (
                    <div>
                      <dt className="text-muted-foreground">Hourly</dt>
                      <dd className="font-medium">${form.hourlyRate}</dd>
                    </div>
                  )}
                  {form.dailyRate && (
                    <div>
                      <dt className="text-muted-foreground">Daily</dt>
                      <dd className="font-medium">${form.dailyRate}</dd>
                    </div>
                  )}
                  {form.weeklyRate && (
                    <div>
                      <dt className="text-muted-foreground">Weekly</dt>
                      <dd className="font-medium">${form.weeklyRate}</dd>
                    </div>
                  )}
                  {form.monthlyRate && (
                    <div>
                      <dt className="text-muted-foreground">Monthly</dt>
                      <dd className="font-medium">${form.monthlyRate}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {(form.licenseNumber || form.licensingAuthority) && (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Licensing</h3>
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    {form.licenseNumber && (
                      <div>
                        <dt className="text-muted-foreground">License #</dt>
                        <dd className="font-medium">{form.licenseNumber}</dd>
                      </div>
                    )}
                    {form.licenseExpiry && (
                      <div>
                        <dt className="text-muted-foreground">Expiry</dt>
                        <dd className="font-medium">{form.licenseExpiry}</dd>
                      </div>
                    )}
                    {form.licensingAuthority && (
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Authority</dt>
                        <dd className="font-medium">{form.licensingAuthority}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => goTo("licensing")}>Back</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Creating..." : "Create Facility"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
