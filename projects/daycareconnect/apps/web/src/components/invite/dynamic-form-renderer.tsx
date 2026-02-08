import { useState } from "react";
import type { FormFieldDefinition } from "@daycare-hub/shared";
import {
  Input,
  Label,
  Textarea,
  Checkbox,
  Button,
} from "@daycare-hub/ui";

interface DynamicFormRendererProps {
  fields: FormFieldDefinition[];
  onSubmit: (data: Record<string, unknown>) => void;
  onBack?: () => void;
  loading?: boolean;
}

export function DynamicFormRenderer({ fields, onSubmit, onBack, loading }: DynamicFormRendererProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateField(id: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    for (const field of fields) {
      if (field.required) {
        const value = formData[field.id];
        if (value === undefined || value === null || value === "" || value === false) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          {field.type === "checkbox" ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id={field.id}
                checked={!!formData[field.id]}
                onCheckedChange={(checked) => updateField(field.id, checked)}
              />
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>
            </div>
          ) : (
            <>
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={field.id}
                  placeholder={field.placeholder}
                  value={(formData[field.id] as string) || ""}
                  onChange={(e) => updateField(field.id, e.target.value)}
                  rows={3}
                />
              ) : field.type === "select" && field.options ? (
                <select
                  id={field.id}
                  value={(formData[field.id] as string) || ""}
                  onChange={(e) => updateField(field.id, e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">{field.placeholder || "Select..."}</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={field.id}
                  type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  placeholder={field.placeholder}
                  value={(formData[field.id] as string) || ""}
                  onChange={(e) => updateField(field.id, e.target.value)}
                />
              )}
            </>
          )}
          {errors[field.id] && (
            <p className="text-sm text-destructive">{errors[field.id]}</p>
          )}
        </div>
      ))}

      <div className="flex justify-between pt-4">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="submit" disabled={loading} className={!onBack ? "ml-auto" : ""}>
          {loading ? "Submitting..." : "Submit & Continue"}
        </Button>
      </div>
    </form>
  );
}
