import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateFacility } from "@daycare-hub/hooks";
import { createFacilitySchema } from "@daycare-hub/shared";
import type { z } from "zod";
import { StepIndicator } from "@/components/shared/step-indicator";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@daycare-hub/ui";

type FormValues = z.input<typeof createFacilitySchema>;

const STEPS = ["basic", "address", "pricing", "licensing", "review"] as const;
type Step = (typeof STEPS)[number];

const STEP_FIELDS: Record<Exclude<Step, "review">, (keyof FormValues)[]> = {
  basic: ["name", "phone", "description", "email", "website"],
  address: ["address", "city", "state", "zipCode"],
  pricing: [
    "capacity",
    "ageRangeMin",
    "ageRangeMax",
    "hourlyRate",
    "dailyRate",
    "weeklyRate",
    "monthlyRate",
  ],
  licensing: ["licenseNumber", "licenseExpiry", "licensingAuthority"],
};

const STEP_LABELS: Record<Step, string> = {
  basic: "Basic Info",
  address: "Address",
  pricing: "Capacity & Pricing",
  licensing: "Licensing",
  review: "Review",
};

interface FacilityFormWizardProps {
  /** Called with the created facility after successful submission */
  onSuccess: (facility: { id: string }) => void;
  /** When true, shows a "Step X of Y" counter above the step indicator */
  showStepCounter?: boolean;
}

export function FacilityFormWizard({ onSuccess, showStepCounter }: FacilityFormWizardProps) {
  const createFacility = useCreateFacility();
  const [step, setStep] = useState<Step>("basic");
  const [submitError, setSubmitError] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(createFacilitySchema),
    defaultValues: {
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
    },
    mode: "onTouched",
  });

  const goTo = async (target: Step) => {
    setSubmitError("");
    const currentIndex = STEPS.indexOf(step);
    const targetIndex = STEPS.indexOf(target);

    if (targetIndex <= currentIndex) {
      setStep(target);
      return;
    }

    for (let i = currentIndex; i < targetIndex; i++) {
      const s = STEPS[i];
      if (s === "review") continue;
      const fields = STEP_FIELDS[s];
      const valid = await form.trigger(fields);
      if (!valid) {
        setStep(s);
        return;
      }
    }

    setStep(target);
  };

  const handleSubmit = async () => {
    setSubmitError("");
    const valid = await form.trigger();
    if (!valid) {
      for (const s of STEPS) {
        if (s === "review") continue;
        const fields = STEP_FIELDS[s];
        const stepValid = await form.trigger(fields);
        if (!stepValid) {
          setStep(s);
          return;
        }
      }
      return;
    }

    try {
      const facility = await createFacility.mutateAsync(form.getValues());
      onSuccess(facility);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to create facility");
    }
  };

  const stepIndex = STEPS.indexOf(step);
  const values = form.watch();

  return (
    <div>
      {showStepCounter && (
        <p className="mb-8 text-muted-foreground">
          Step {stepIndex + 1} of {STEPS.length} — {STEP_LABELS[step]}
        </p>
      )}

      <StepIndicator steps={STEPS} currentStep={step} onStepClick={goTo} />

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          {/* Basic Info */}
          {step === "basic" && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facility Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Sunshine Daycare Center" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={4}
                          placeholder="Tell parents about your facility..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(555) 123-4567" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="contact@example.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" placeholder="https://" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-2">
                  <Button type="button" onClick={() => goTo("address")}>
                    Continue
                  </Button>
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
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Main Street" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Springfield" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            maxLength={2}
                            placeholder="CA"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              field.onChange(e.target.value.toUpperCase().slice(0, 2))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="90210" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => goTo("basic")}>
                    Back
                  </Button>
                  <Button type="button" onClick={() => goTo("pricing")}>
                    Continue
                  </Button>
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
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            value={field.value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ageRangeMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Age</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ageRangeMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Age</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-medium">Pricing (optional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hourlyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hourly Rate ($)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dailyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Daily Rate ($)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weeklyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weekly Rate ($)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="monthlyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rate ($)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => goTo("address")}>
                    Back
                  </Button>
                  <Button type="button" onClick={() => goTo("licensing")}>
                    Continue
                  </Button>
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
                <FormField
                  control={form.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. DCC-2024-12345" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="licenseExpiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Expiry</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="licensingAuthority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Licensing Authority</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. State Dept. of Education" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => goTo("pricing")}>
                    Back
                  </Button>
                  <Button type="button" onClick={() => goTo("review")}>
                    Continue
                  </Button>
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
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Basic Info
                    </h3>
                    <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Name</dt>
                        <dd className="font-medium">{values.name || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Phone</dt>
                        <dd className="font-medium">{values.phone || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Email</dt>
                        <dd className="font-medium">{values.email || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Website</dt>
                        <dd className="font-medium">{values.website || "—"}</dd>
                      </div>
                    </dl>
                    {values.description && (
                      <div className="mt-3 text-sm">
                        <dt className="text-muted-foreground">Description</dt>
                        <dd className="mt-1">{values.description}</dd>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Address
                    </h3>
                    <p className="text-sm font-medium">
                      {values.address}
                      {values.city && `, ${values.city}`}
                      {values.state && `, ${values.state}`} {values.zipCode}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Capacity & Pricing
                    </h3>
                    <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Capacity</dt>
                        <dd className="font-medium">{values.capacity}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Age Range</dt>
                        <dd className="font-medium">
                          {values.ageRangeMin}–{values.ageRangeMax} years
                        </dd>
                      </div>
                      {values.hourlyRate && (
                        <div>
                          <dt className="text-muted-foreground">Hourly</dt>
                          <dd className="font-medium">${values.hourlyRate}</dd>
                        </div>
                      )}
                      {values.dailyRate && (
                        <div>
                          <dt className="text-muted-foreground">Daily</dt>
                          <dd className="font-medium">${values.dailyRate}</dd>
                        </div>
                      )}
                      {values.weeklyRate && (
                        <div>
                          <dt className="text-muted-foreground">Weekly</dt>
                          <dd className="font-medium">${values.weeklyRate}</dd>
                        </div>
                      )}
                      {values.monthlyRate && (
                        <div>
                          <dt className="text-muted-foreground">Monthly</dt>
                          <dd className="font-medium">${values.monthlyRate}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {(values.licenseNumber || values.licensingAuthority) && (
                    <div className="rounded-lg border p-4">
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Licensing
                      </h3>
                      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        {values.licenseNumber && (
                          <div>
                            <dt className="text-muted-foreground">License #</dt>
                            <dd className="font-medium">{values.licenseNumber}</dd>
                          </div>
                        )}
                        {values.licenseExpiry && (
                          <div>
                            <dt className="text-muted-foreground">Expiry</dt>
                            <dd className="font-medium">{values.licenseExpiry}</dd>
                          </div>
                        )}
                        {values.licensingAuthority && (
                          <div className="col-span-2">
                            <dt className="text-muted-foreground">Authority</dt>
                            <dd className="font-medium">{values.licensingAuthority}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </div>

                {submitError && <p className="text-sm text-destructive">{submitError}</p>}

                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => goTo("licensing")}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? "Creating..." : "Create Facility"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </Form>
    </div>
  );
}
