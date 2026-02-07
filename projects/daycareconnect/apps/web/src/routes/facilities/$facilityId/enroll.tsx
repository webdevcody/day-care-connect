import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authMiddleware } from "@/lib/middleware";
import { getFacility } from "@/lib/server/facilities";
import { getMyChildren } from "@/lib/server/children";
import { createEnrollment } from "@/lib/server/enrollments";
import { SCHEDULE_TYPES } from "@daycare-hub/shared";
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
import { APP_NAME } from "@daycare-hub/shared";

export const Route = createFileRoute("/facilities/$facilityId/enroll")({
  server: {
    middleware: [authMiddleware],
  },
  loader: async ({ params }) => {
    const [facility, children] = await Promise.all([
      getFacility({ data: { facilityId: params.facilityId } }),
      getMyChildren(),
    ]);
    return { facility, children };
  },
  component: EnrollmentWizardPage,
});

type Step = "child" | "schedule" | "notes" | "review";

function EnrollmentWizardPage() {
  const { facility, children } = Route.useLoaderData();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("child");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [scheduleType, setScheduleType] = useState<string>("full_time");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      await createEnrollment({
        data: {
          childId: selectedChildId,
          facilityId: facility.id,
          scheduleType: scheduleType as any,
          startDate,
          notes: notes || undefined,
        },
      });
      navigate({ to: "/parent" });
    } catch (err: any) {
      setError(err.message || "Failed to submit application");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <a href="/" className="text-xl font-bold text-primary">{APP_NAME}</a>
          <Link
            to="/facilities/$facilityId"
            params={{ facilityId: facility.id }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to Facility
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold">Apply for Enrollment</h1>
        <p className="mt-1 text-muted-foreground">
          {facility.name} &middot; {facility.city}, {facility.state}
        </p>

        {/* Step indicator */}
        <div className="mt-6 flex gap-2">
          {(["child", "schedule", "notes", "review"] as const).map((s, i) => (
            <div
              key={s}
              className={`flex-1 rounded-full py-1 text-center text-xs font-medium ${
                s === step
                  ? "bg-primary text-primary-foreground"
                  : (["child", "schedule", "notes", "review"].indexOf(step) > i)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6">
          {step === "child" && (
            <Card>
              <CardHeader>
                <CardTitle>Select a Child</CardTitle>
              </CardHeader>
              <CardContent>
                {children.length === 0 ? (
                  <div className="text-center">
                    <p className="text-muted-foreground">
                      You need to add a child before enrolling.
                    </p>
                    <Button asChild className="mt-4">
                      <Link to="/parent/children/new">Add Child</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => setSelectedChildId(child.id)}
                        className={`w-full rounded-lg border p-4 text-left transition-colors ${
                          selectedChildId === child.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <p className="font-medium">
                          {child.firstName} {child.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Born {child.dateOfBirth}
                          {child.gender && ` · ${child.gender}`}
                        </p>
                      </button>
                    ))}
                    <div className="flex justify-end pt-4">
                      <Button
                        disabled={!selectedChildId}
                        onClick={() => setStep("schedule")}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === "schedule" && (
            <Card>
              <CardHeader>
                <CardTitle>Schedule & Start Date</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Schedule Type</Label>
                  <div className="flex gap-3">
                    {SCHEDULE_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setScheduleType(type)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          scheduleType === type
                            ? "border-primary bg-primary/5 text-primary"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        {type.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Desired Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep("child")}>
                    Back
                  </Button>
                  <Button
                    disabled={!startDate}
                    onClick={() => setStep("notes")}
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "notes" && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests, preferred schedule details, etc."
                    rows={4}
                  />
                </div>
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep("schedule")}
                  >
                    Back
                  </Button>
                  <Button onClick={() => setStep("review")}>
                    Review Application
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "review" && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Submit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Facility</p>
                    <p className="font-medium">{facility.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Child</p>
                    <p className="font-medium">
                      {selectedChild?.firstName} {selectedChild?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Schedule</p>
                    <p className="font-medium capitalize">
                      {scheduleType.replace("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium">{startDate}</p>
                  </div>
                  {notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="font-medium">{notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep("notes")}>
                    Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? "Submitting..." : "Submit Application"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
