import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompleteOnboarding } from "@daycare-hub/hooks";
import { onboardingSchema } from "@daycare-hub/shared";
import type { OnboardingInput } from "@daycare-hub/shared";
import { useSession } from "@/lib/auth-client";
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

export const Route = createFileRoute("/_parent/parent/onboarding")({
  component: OnboardingPage,
});

const STEPS = ["welcome", "profile", "children", "review"] as const;
type Step = (typeof STEPS)[number];

function OnboardingPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const completeOnboarding = useCompleteOnboarding();
  const [step, setStep] = useState<Step>("welcome");
  const [submitError, setSubmitError] = useState("");

  const user = session?.user as any;

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      phone: user?.phone || "",
      address: user?.address || "",
      city: user?.city || "",
      state: user?.state || "",
      zipCode: user?.zipCode || "",
      children: [
        {
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          gender: "",
          allergies: "",
          medicalNotes: "",
          emergencyContactName: "",
          emergencyContactPhone: "",
        },
      ],
    },
    mode: "onTouched",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "children",
  });

  const goTo = async (target: Step) => {
    setSubmitError("");
    const currentIndex = STEPS.indexOf(step);
    const targetIndex = STEPS.indexOf(target);

    // Going backward — no validation needed
    if (targetIndex <= currentIndex) {
      setStep(target);
      return;
    }

    // Validate current step before advancing
    if (step === "profile") {
      const valid = await form.trigger(["phone", "address", "city", "state", "zipCode"]);
      if (!valid) {
        return;
      }
    } else if (step === "children") {
      const valid = await form.trigger("children");
      if (!valid) {
        return;
      }
    }

    setStep(target);
  };

  const handleSubmit = async () => {
    setSubmitError("");
    const valid = await form.trigger();
    if (!valid) {
      // Find first step with errors
      const profileValid = await form.trigger(["phone", "address", "city", "state", "zipCode"]);
      if (!profileValid) {
        setStep("profile");
        return;
      }
      const childrenValid = await form.trigger("children");
      if (!childrenValid) {
        setStep("children");
        return;
      }
      return;
    }

    try {
      await completeOnboarding.mutateAsync(form.getValues());
      navigate({ to: "/parent" });
    } catch (err: any) {
      setSubmitError(err.message || "Failed to complete onboarding");
    }
  };

  const firstName = session?.user?.firstName || "there";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-2xl">
        {/* Step indicator */}
        {step !== "welcome" && (
          <StepIndicator steps={STEPS} currentStep={step} onStepClick={goTo} />
        )}

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            {/* Step 1: Welcome */}
            {step === "welcome" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">
                    Welcome to DayCareConnect, {firstName}!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    We're excited to have you here. Let's get your account set up in just a few
                    quick steps.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>We'll collect:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Your contact information and address</li>
                      <li>Information about your children</li>
                    </ul>
                    <p className="mt-4">This should only take about 30 seconds.</p>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => goTo("profile")} size="lg">
                      Let's Get Started
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Profile Info */}
            {step === "profile" && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {submitError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {submitError}
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" placeholder="(555) 123-4567" />
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
                        <FormLabel>Street Address *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123 Main St" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
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
                            <Input {...field} placeholder="IL" maxLength={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="62701" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={() => goTo("welcome")}>
                      Back
                    </Button>
                    <Button type="button" onClick={() => goTo("children")}>
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Add Children */}
            {step === "children" && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Your Children</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {submitError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {submitError}
                    </div>
                  )}
                  {fields.map((field, index) => (
                    <Card key={field.id} className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {index === 0 ? "Child Information" : `Child ${index + 1}`}
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-2"
                              onClick={() => remove(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`children.${index}.firstName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Emma" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`children.${index}.lastName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Smith" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`children.${index}.dateOfBirth`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date of Birth *</FormLabel>
                                <FormControl>
                                  <Input {...field} type="date" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`children.${index}.gender`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Gender</FormLabel>
                                <FormControl>
                                  <select
                                    {...field}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  >
                                    <option value="">Select...</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`children.${index}.allergies`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Allergies</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="List any known allergies..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`children.${index}.medicalNotes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Medical Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Any medical conditions or notes..."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`children.${index}.emergencyContactName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Emergency Contact Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="John Doe" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`children.${index}.emergencyContactPhone`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Emergency Contact Phone</FormLabel>
                                <FormControl>
                                  <Input {...field} type="tel" placeholder="(555) 123-4567" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      append({
                        firstName: "",
                        lastName: "",
                        dateOfBirth: "",
                        gender: "",
                        allergies: "",
                        medicalNotes: "",
                        emergencyContactName: "",
                        emergencyContactPhone: "",
                      })
                    }
                  >
                    Add Another Child
                  </Button>
                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={() => goTo("profile")}>
                      Back
                    </Button>
                    <Button type="button" onClick={() => goTo("review")}>
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Review */}
            {step === "review" && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Your Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {submitError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {submitError}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Your Contact Information</h3>
                    <div className="bg-muted/50 rounded-md p-4 space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Phone:</span> {form.watch("phone")}
                      </p>
                      <p>
                        <span className="font-medium">Address:</span> {form.watch("address")}
                      </p>
                      <p>
                        <span className="font-medium">City:</span> {form.watch("city")},{" "}
                        {form.watch("state")} {form.watch("zipCode")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Your Children</h3>
                    <div className="space-y-3">
                      {form.watch("children").map((child, index) => (
                        <Card key={index} className="bg-muted/50">
                          <CardContent className="pt-4">
                            <p className="font-medium">
                              {child.firstName} {child.lastName}
                            </p>
                            {child.dateOfBirth && (
                              <p className="text-sm text-muted-foreground">
                                Born: {new Date(child.dateOfBirth).toLocaleDateString()}
                              </p>
                            )}
                            {child.gender && (
                              <p className="text-sm text-muted-foreground">
                                Gender: {child.gender}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={() => goTo("children")}>
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={completeOnboarding.isPending}
                      size="lg"
                    >
                      {completeOnboarding.isPending ? "Completing..." : "Complete Setup"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
