import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@daycare-hub/ui";
import { Button, Textarea } from "@daycare-hub/ui";

interface ReviewResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBody?: string;
  onSave: (body: string) => void;
  isSaving?: boolean;
}

export function ReviewResponseDialog({
  open,
  onOpenChange,
  initialBody,
  onSave,
  isSaving,
}: ReviewResponseDialogProps) {
  const [body, setBody] = useState(initialBody ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialBody ? "Edit Response" : "Respond to Review"}
          </DialogTitle>
        </DialogHeader>
        <div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            placeholder="Write your response..."
            rows={4}
          />
          <p className="mt-1 text-xs text-muted-foreground">{body.length}/2000</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(body)}
            disabled={!body.trim() || isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
