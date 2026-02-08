import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAdminDocumentTemplates,
  useCreateDocumentTemplate,
  useUpdateDocumentTemplate,
  useReorderDocumentTemplates,
} from "@daycare-hub/hooks";
import { uploadsService } from "@daycare-hub/services";
import { DOCUMENT_CATEGORIES, FORM_TYPES } from "@daycare-hub/shared";
import type { FormFieldDefinition } from "@daycare-hub/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Textarea,
  Checkbox,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@daycare-hub/ui";
import { ArrowUp, ArrowDown, Plus, FileText, FileUp, FormInput } from "lucide-react";

export const Route = createFileRoute("/_facility/facility/$facilityId/invites/forms")({
  component: EnrollmentFormsPage,
});

function EnrollmentFormsPage() {
  const { facilityId } = Route.useParams();
  const { data: allTemplates = [], isLoading } = useAdminDocumentTemplates(facilityId);
  const createTemplate = useCreateDocumentTemplate();
  const updateTemplate = useUpdateDocumentTemplate();
  const reorderTemplates = useReorderDocumentTemplates();

  const [createOpen, setCreateOpen] = useState(false);

  const enrollmentTemplates = allTemplates
    .filter((t: any) => t.isRequiredForEnrollment && !t.isArchived)
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  const otherTemplates = allTemplates.filter(
    (t: any) => !t.isRequiredForEnrollment && !t.isArchived
  );

  async function toggleEnrollmentRequired(template: any) {
    await updateTemplate.mutateAsync({
      templateId: template.id,
      data: { isRequiredForEnrollment: !template.isRequiredForEnrollment },
    });
  }

  async function moveTemplate(index: number, direction: "up" | "down") {
    const newOrder = [...enrollmentTemplates];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;

    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];

    await reorderTemplates.mutateAsync({
      facilityId,
      items: newOrder.map((t: any, i: number) => ({ id: t.id, sortOrder: i })),
    });
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Enrollment Forms</h1>
          <p className="text-sm text-muted-foreground">
            Configure which forms parents must complete when enrolling via invite link.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Create Form
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="mb-2 text-lg font-semibold">Required for Enrollment</h2>
          {enrollmentTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No forms required for enrollment yet. Toggle forms below or create a new one.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {enrollmentTemplates.map((template: any, index: number) => (
                <Card key={template.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        disabled={index === 0}
                        onClick={() => moveTemplate(index, "up")}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        disabled={index === enrollmentTemplates.length - 1}
                        onClick={() => moveTemplate(index, "down")}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{template.title}</p>
                        <FormTypeBadge type={template.formType} />
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleEnrollmentRequired(template)}
                    >
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">Available Templates</h2>
          {otherTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All templates are marked for enrollment.
            </p>
          ) : (
            <div className="space-y-2">
              {otherTemplates.map((template: any) => (
                <Card key={template.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{template.title}</p>
                        <FormTypeBadge type={template.formType} />
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleEnrollmentRequired(template)}
                    >
                      Add to Enrollment
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateFormDialog facilityId={facilityId} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function FormTypeBadge({ type }: { type: string }) {
  const icons: Record<string, typeof FileText> = {
    markdown: FileText,
    pdf: FileUp,
    custom_form: FormInput,
  };
  const Icon = icons[type] || FileText;
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" />
      {type === "custom_form" ? "Custom Form" : type === "pdf" ? "PDF" : "Markdown"}
    </Badge>
  );
}

function CreateFormDialog({
  facilityId,
  open,
  onOpenChange,
}: {
  facilityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createTemplate = useCreateDocumentTemplate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("enrollment");
  const [formType, setFormType] = useState<string>("markdown");
  const [content, setContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addField() {
    setFields([
      ...fields,
      {
        id: `field_${Date.now()}`,
        type: "text",
        label: "",
        required: false,
      },
    ]);
  }

  function updateField(index: number, updates: Partial<FormFieldDefinition>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!title) return;
    setError("");
    setLoading(true);

    try {
      let pdfUrl: string | undefined;
      if (formType === "pdf" && pdfFile) {
        const result = await uploadsService.uploadPdf(pdfFile);
        pdfUrl = result.url;
      }

      await createTemplate.mutateAsync({
        facilityId,
        data: {
          title,
          description: description || undefined,
          category,
          formType,
          content: formType === "markdown" ? content : "",
          pdfUrl: pdfUrl || undefined,
          formSchema: formType === "custom_form" ? fields : undefined,
          isRequiredForEnrollment: true,
        },
      });

      onOpenChange(false);
      setTitle("");
      setDescription("");
      setContent("");
      setPdfFile(null);
      setFields([]);
      setFormType("markdown");
    } catch (err: any) {
      setError(err.message || "Failed to create form");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Enrollment Form</DialogTitle>
          <DialogDescription>Create a new enrollment form for your facility.</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Parent Handbook Agreement"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this form"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Form Type</Label>
            <div className="flex gap-3">
              {(["markdown", "pdf", "custom_form"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormType(type)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    formType === type
                      ? "border-primary bg-primary/5 text-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {type === "markdown" && <FileText className="h-4 w-4" />}
                  {type === "pdf" && <FileUp className="h-4 w-4" />}
                  {type === "custom_form" && <FormInput className="h-4 w-4" />}
                  {type === "custom_form"
                    ? "Custom Form"
                    : type === "pdf"
                      ? "PDF Upload"
                      : "Markdown"}
                </button>
              ))}
            </div>
          </div>

          {formType === "markdown" && (
            <div className="space-y-2">
              <Label>Content (Markdown)</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                placeholder="# Document Title&#10;&#10;Write your document content here using Markdown..."
              />
            </div>
          )}

          {formType === "pdf" && (
            <div className="space-y-2">
              <Label>Upload PDF</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              />
              {pdfFile && <p className="text-sm text-muted-foreground">Selected: {pdfFile.name}</p>}
            </div>
          )}

          {formType === "custom_form" && (
            <div className="space-y-3">
              <Label>Form Fields</Label>
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Field label"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      className="flex-1"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, { type: e.target.value as any })}
                      className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="select">Select</option>
                      <option value="date">Date</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="number">Number</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(index)}
                      className="text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.required}
                        onCheckedChange={(checked) => updateField(index, { required: !!checked })}
                      />
                      <span className="text-sm">Required</span>
                    </div>
                    <Input
                      placeholder="Placeholder text (optional)"
                      value={field.placeholder || ""}
                      onChange={(e) => updateField(index, { placeholder: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                  {field.type === "select" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Options (comma-separated)</Label>
                      <Input
                        placeholder="Option 1, Option 2, Option 3"
                        value={field.options?.join(", ") || ""}
                        onChange={(e) =>
                          updateField(index, {
                            options: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addField}>
                <Plus className="mr-1 h-3 w-3" />
                Add Field
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !title || (formType === "pdf" && !pdfFile)}
            >
              {loading ? "Creating..." : "Create Form"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
