import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button, Input, Label, Textarea } from "@daycare-hub/ui";
import type { CreateChildInput } from "@daycare-hub/shared";

interface ChildFormProps {
  defaultValues?: Partial<CreateChildInput>;
  onSubmit: (data: CreateChildInput) => Promise<void>;
  submitLabel?: string;
}

export function ChildForm({ defaultValues, onSubmit, submitLabel = "Save" }: ChildFormProps) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    // Helper to convert empty strings to undefined
    const getValue = (key: string): string | undefined => {
      const value = formData.get(key) as string;
      return value && value.trim() ? value.trim() : undefined;
    };

    const data: CreateChildInput = {
      firstName: (formData.get("firstName") as string)?.trim() || "",
      lastName: (formData.get("lastName") as string)?.trim() || "",
      dateOfBirth: (formData.get("dateOfBirth") as string)?.trim() || "",
      gender: getValue("gender"),
      allergies: getValue("allergies"),
      medicalNotes: getValue("medicalNotes"),
      emergencyContactName: getValue("emergencyContactName"),
      emergencyContactPhone: getValue("emergencyContactPhone"),
    };

    try {
      await onSubmit(data);
      // Reset loading state on success (navigation will happen in parent)
      setLoading(false);
    } catch (err: any) {
      // Handle validation errors from API
      let errorMessage = "Something went wrong";
      if (err.message) {
        errorMessage = err.message;
      } else if (err.details && Array.isArray(err.details)) {
        // Format validation errors from API
        errorMessage = err.details.map((d: any) => d.message || d.path?.join(".")).join(", ");
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      setError(errorMessage);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div>
        <h3 className="text-lg font-medium">Basic Information</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              name="firstName"
              required
              defaultValue={defaultValues?.firstName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input id="lastName" name="lastName" required defaultValue={defaultValues?.lastName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth *</Label>
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              required
              defaultValue={defaultValues?.dateOfBirth}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              name="gender"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              defaultValue={defaultValues?.gender || ""}
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium">Medical Information</h3>
        <div className="mt-4 grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea
              id="allergies"
              name="allergies"
              placeholder="List any known allergies..."
              defaultValue={defaultValues?.allergies}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="medicalNotes">Medical Notes</Label>
            <Textarea
              id="medicalNotes"
              name="medicalNotes"
              placeholder="Any medical conditions or notes..."
              defaultValue={defaultValues?.medicalNotes}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium">Emergency Contact</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emergencyContactName">Contact Name</Label>
            <Input
              id="emergencyContactName"
              name="emergencyContactName"
              defaultValue={defaultValues?.emergencyContactName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
            <Input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              type="tel"
              defaultValue={defaultValues?.emergencyContactPhone}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate({ to: "/parent/children" })}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
