import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  useInviteInfo,
  useStartInvite,
  useSubmitInviteForm,
  useCompleteInvite,
  useChildren,
} from "@daycare-hub/hooks";
import { SCHEDULE_TYPES, APP_NAME } from "@daycare-hub/shared";
import type { FormFieldDefinition } from "@daycare-hub/shared";
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
import { InviteAuthGate } from "@/components/invite/invite-auth-gate";
import { MarkdownSignStep } from "@/components/invite/markdown-sign-step";
import { PdfSignStep } from "@/components/invite/pdf-sign-step";
import { DynamicFormRenderer } from "@/components/invite/dynamic-form-renderer";
import { CheckCircle } from "lucide-react";

export const Route = createFileRoute("/invite/$code")({
  component: InviteWizardPage,
});

function InviteWizardPage() {
  const { code } = Route.useParams();
  const { data: inviteData, isLoading, error } = useInviteInfo(code);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading invite...</div>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-destructive">
              {(error as any)?.message || "Invite not found"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              This invite link may be expired or invalid.
            </p>
            <Button asChild className="mt-4">
              <Link to="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <a href="/" className="text-xl font-bold text-primary">{APP_NAME}</a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold">You're Invited!</h1>
        <p className="mt-1 text-muted-foreground">
          Enroll at {inviteData.facility.name} &middot; {inviteData.facility.city}, {inviteData.facility.state}
        </p>

        <div className="mt-6">
          <InviteAuthGate>
            <InviteWizardContent
              code={code}
              inviteData={inviteData}
            />
          </InviteAuthGate>
        </div>
      </div>
    </div>
  );
}

interface InviteWizardContentProps {
  code: string;
  inviteData: any;
}

function InviteWizardContent({ code, inviteData }: InviteWizardContentProps) {
  const { templates, facility } = inviteData;
  const { data: childrenData } = useChildren();
  const startInvite = useStartInvite();
  const submitForm = useSubmitInviteForm();
  const completeInvite = useCompleteInvite();

  // Steps: child -> forms[0..n] -> schedule -> review -> success
  const [currentStep, setCurrentStep] = useState(0);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [isNewChild, setIsNewChild] = useState(false);
  const [newChild, setNewChild] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    allergies: "",
    medicalNotes: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });
  const [scheduleType, setScheduleType] = useState("full_time");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [completedFormIds, setCompletedFormIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const children = Array.isArray(childrenData) ? childrenData : (childrenData?.children ?? []);
  const totalSteps = 1 + templates.length + 1 + 1; // child + forms + schedule + review
  const stepLabels = [
    "Child",
    ...templates.map((t: any) => t.title),
    "Schedule",
    "Review",
  ];

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";

  async function handleStartInvite() {
    setError("");
    setLoading(true);
    try {
      const data: any = {};
      if (isNewChild) {
        data.child = newChild;
      } else {
        data.childId = selectedChildId;
      }
      const result = await startInvite.mutateAsync({ code, data });
      setSubmissionId(result.id);
      if (result.childId) setSelectedChildId(result.childId);
      setCurrentStep(1);
    } catch (err: any) {
      setError(err.message || "Failed to start");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForm(templateId: string, formData?: any, signatureName?: string) {
    setError("");
    setLoading(true);
    try {
      await submitForm.mutateAsync({
        code,
        data: { templateId, formData, signatureName },
      });
      setCompletedFormIds((prev) => [...prev, templateId]);
      setCurrentStep((prev) => prev + 1);
    } catch (err: any) {
      setError(err.message || "Failed to submit form");
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    setError("");
    setLoading(true);
    try {
      await completeInvite.mutateAsync({
        code,
        data: { scheduleType, startDate, notes: notes || undefined },
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Failed to complete enrollment");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="mt-4 text-2xl font-bold">Enrollment Submitted!</h2>
          <p className="mt-2 text-muted-foreground">
            Your enrollment at {facility.name} is pending review. The facility will
            contact you once it's approved.
          </p>
          <Button asChild className="mt-6">
            <Link to="/parent">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Step indicator */}
      <div className="mb-6 flex gap-1">
        {stepLabels.map((label, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full py-1 text-center text-xs font-medium truncate px-1 ${
              i === currentStep
                ? "bg-primary text-primary-foreground"
                : i < currentStep
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 0: Child selection */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select or Add a Child</CardTitle>
          </CardHeader>
          <CardContent>
            {children.length > 0 && !isNewChild && (
              <div className="space-y-3">
                {children.map((child: any) => (
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
                    </p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setIsNewChild(true); setSelectedChildId(""); }}
                  className="w-full rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground hover:bg-muted/50"
                >
                  + Add a new child
                </button>
                <div className="flex justify-end pt-4">
                  <Button
                    disabled={!selectedChildId || loading}
                    onClick={handleStartInvite}
                  >
                    {loading ? "Starting..." : "Next"}
                  </Button>
                </div>
              </div>
            )}

            {(children.length === 0 || isNewChild) && (
              <div className="space-y-4">
                {isNewChild && children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsNewChild(false)}
                    className="text-sm text-primary hover:underline"
                  >
                    &larr; Select an existing child
                  </button>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={newChild.firstName}
                      onChange={(e) => setNewChild({ ...newChild, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={newChild.lastName}
                      onChange={(e) => setNewChild({ ...newChild, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={newChild.dateOfBirth}
                    onChange={(e) => setNewChild({ ...newChild, dateOfBirth: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender (optional)</Label>
                  <Input
                    value={newChild.gender}
                    onChange={(e) => setNewChild({ ...newChild, gender: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Allergies (optional)</Label>
                  <Textarea
                    value={newChild.allergies}
                    onChange={(e) => setNewChild({ ...newChild, allergies: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Medical Notes (optional)</Label>
                  <Textarea
                    value={newChild.medicalNotes}
                    onChange={(e) => setNewChild({ ...newChild, medicalNotes: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Emergency Contact Name</Label>
                    <Input
                      value={newChild.emergencyContactName}
                      onChange={(e) => setNewChild({ ...newChild, emergencyContactName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency Contact Phone</Label>
                    <Input
                      value={newChild.emergencyContactPhone}
                      onChange={(e) => setNewChild({ ...newChild, emergencyContactPhone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    disabled={!newChild.firstName || !newChild.lastName || !newChild.dateOfBirth || loading}
                    onClick={handleStartInvite}
                  >
                    {loading ? "Starting..." : "Next"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form steps */}
      {currentStep >= 1 && currentStep <= templates.length && (() => {
        const template = templates[currentStep - 1];
        return (
          <Card>
            <CardHeader>
              <CardTitle>{template.title}</CardTitle>
              {template.description && (
                <p className="text-sm text-muted-foreground">{template.description}</p>
              )}
            </CardHeader>
            <CardContent>
              {template.formType === "markdown" && (
                <MarkdownSignStep
                  content={template.content || ""}
                  title={template.title}
                  onSubmit={(signatureName) =>
                    handleSubmitForm(template.id, undefined, signatureName)
                  }
                  onBack={currentStep > 0 ? () => setCurrentStep((prev) => prev - 1) : undefined}
                  loading={loading}
                />
              )}
              {template.formType === "pdf" && (
                <PdfSignStep
                  pdfUrl={template.pdfUrl || ""}
                  title={template.title}
                  apiUrl={apiUrl}
                  onSubmit={(signatureName) =>
                    handleSubmitForm(template.id, undefined, signatureName)
                  }
                  onBack={() => setCurrentStep((prev) => prev - 1)}
                  loading={loading}
                />
              )}
              {template.formType === "custom_form" && (
                <DynamicFormRenderer
                  fields={(template.formSchema as FormFieldDefinition[]) || []}
                  onSubmit={(formData) =>
                    handleSubmitForm(template.id, formData)
                  }
                  onBack={() => setCurrentStep((prev) => prev - 1)}
                  loading={loading}
                />
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Schedule step */}
      {currentStep === templates.length + 1 && (
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
              <Label>Desired Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or notes..."
                rows={3}
              />
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep((prev) => prev - 1)}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep((prev) => prev + 1)}>
                Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review step */}
      {currentStep === templates.length + 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Facility</p>
                <p className="font-medium">{facility.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Schedule</p>
                <p className="font-medium capitalize">{scheduleType.replace("_", " ")}</p>
              </div>
              {startDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{startDate}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Forms Completed</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {templates.map((t: any) => (
                    <Badge
                      key={t.id}
                      variant={completedFormIds.includes(t.id) ? "default" : "outline"}
                    >
                      {t.title} {completedFormIds.includes(t.id) ? "✓" : ""}
                    </Badge>
                  ))}
                </div>
              </div>
              {notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep((prev) => prev - 1)}>
                Back
              </Button>
              <Button onClick={handleComplete} disabled={loading}>
                {loading ? "Submitting..." : "Submit Enrollment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
