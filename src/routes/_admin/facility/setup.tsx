import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFacility, getMyFacility } from "@/server/facilities";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Check } from "lucide-react";

const phoneRegex = /^\+?[\d\s\-().]{7,15}$/;
const zipRegex = /^\d{5}(-\d{4})?$/;
const stateRegex = /^[A-Za-z]{2}$/;

const step1Schema = z.object({
  name: z.string().min(1, "Facility name is required"),
  description: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z
    .string()
    .min(1, "State is required")
    .regex(stateRegex, "Enter a 2-letter state code (e.g. CA)"),
  zipCode: z
    .string()
    .min(1, "Zip code is required")
    .regex(zipRegex, "Enter a valid zip code (e.g. 12345)"),
});

const step2Schema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(phoneRegex, "Enter a valid phone number"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

const fullSchema = step1Schema.merge(step2Schema);

type SetupFormValues = z.infer<typeof fullSchema>;

export const Route = createFileRoute("/_admin/facility/setup")({
  component: FacilitySetupPage,
});

const STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Contact" },
];

function FacilitySetupPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
    },
  });

  useEffect(() => {
    getMyFacility().then((facility) => {
      if (facility) {
        window.location.href = `/facility/${facility.id}`;
      } else {
        setChecking(false);
      }
    });
  }, []);

  async function handleNext() {
    const values = form.getValues();
    const result = step1Schema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof SetupFormValues;
        form.setError(field, { message: issue.message });
      }
      return;
    }
    form.clearErrors();
    setStep(2);
  }

  async function handleCreate() {
    const values = form.getValues();
    const result = step2Schema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof SetupFormValues;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    setError("");
    setLoading(true);

    try {
      const facility = await createFacility({
        data: {
          name: values.name,
          description: values.description || undefined,
          address: values.address,
          city: values.city,
          state: values.state,
          zipCode: values.zipCode,
          phone: values.phone,
          email: values.email,
        },
      });
      // Hard navigate so the _admin layout re-fetches facility state
      window.location.href = `/facility/${facility.id}`;
    } catch (err) {
      console.error("createFacility error:", err);
      setError(String((err as any)?.message ?? "Failed to create facility"));
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Set Up Your Facility</CardTitle>
          <CardDescription>
            Step {step} of {STEPS.length} &mdash; {STEPS[step - 1].label}
          </CardDescription>
          <div className="flex items-center justify-center gap-0 pt-4">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                      step > s.id
                        ? "bg-primary text-primary-foreground"
                        : step === s.id
                          ? "bg-primary text-primary-foreground"
                          : "border-2 border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                  </div>
                  <span
                    className={`text-xs ${step >= s.id ? "font-medium text-foreground" : "text-muted-foreground"}`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mb-5 h-0.5 w-16 ${step > s.id ? "bg-primary" : "bg-muted-foreground/30"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardHeader>
        <Form {...form}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className={step !== 1 ? "hidden" : "space-y-4"}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facility Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address *</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                        <Input {...field} />
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
                        <Input {...field} placeholder="CA" maxLength={2} />
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
                        <Input {...field} placeholder="12345" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className={step !== 2 ? "hidden" : "space-y-4"}>
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="(555) 123-4567"
                      />
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
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="contact@facility.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={step === 1}
              >
                Back
              </Button>
              {step < 2 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="button" onClick={handleCreate} disabled={loading}>
                  {loading ? "Creating..." : "Create Facility"}
                </Button>
              )}
            </div>
          </CardContent>
        </Form>
      </Card>
    </div>
  );
}
