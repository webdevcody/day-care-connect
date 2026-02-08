import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from "@daycare-hub/ui";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@daycare-hub/shared";

interface TemplateFormData {
  title: string;
  description: string;
  content: string;
  category: DocumentCategory;
  isRequired: boolean;
}

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  initialData?: Partial<TemplateFormData>;
  isEdit?: boolean;
  loading?: boolean;
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEdit = false,
  loading = false,
}: TemplateFormDialogProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [category, setCategory] = useState<DocumentCategory>(initialData?.category || "other");
  const [isRequired, setIsRequired] = useState(initialData?.isRequired || false);

  const resetForm = () => {
    if (!isEdit) {
      setTitle("");
      setDescription("");
      setContent("");
      setCategory("other");
      setIsRequired(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ title, description, content, category, isRequired });
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the template details below." : "Fill out the details to create a new document template."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Enrollment Agreement"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this document"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end space-x-2 pb-2">
              <Checkbox
                id="isRequired"
                checked={isRequired}
                onCheckedChange={(checked) => setIsRequired(checked === true)}
              />
              <Label htmlFor="isRequired" className="cursor-pointer">Required document</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content (Markdown)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter document content in Markdown format..."
              rows={12}
              required
            />
          </div>
          {isEdit && (
            <p className="text-sm text-muted-foreground">
              Saving changes will create a new version of this template. Existing sent documents will not be affected.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title || !content}>
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
