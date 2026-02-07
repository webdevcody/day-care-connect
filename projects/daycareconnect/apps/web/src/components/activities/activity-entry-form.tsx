import { useState } from "react";
import {
  ACTIVITY_TYPES,
  MEAL_TYPES,
  AMOUNT_EATEN,
  NAP_QUALITY,
  ACTIVITY_CATEGORIES,
  MOODS,
  BATHROOM_TYPES,
  INCIDENT_SEVERITY,
  type ActivityType,
} from "@daycare-hub/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Checkbox,
} from "@daycare-hub/ui";
import { ActivityIcon, getActivityLabel } from "./activity-icon";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

interface ActivityEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: Child[];
  defaultType?: ActivityType;
  onSubmit: (data: {
    childIds: string[];
    type: ActivityType;
    data: Record<string, unknown>;
    photoUrl?: string;
    occurredAt: string;
  }) => Promise<void>;
}

export function ActivityEntryForm({
  open,
  onOpenChange,
  children,
  defaultType,
  onSubmit,
}: ActivityEntryFormProps) {
  const [type, setType] = useState<ActivityType>(defaultType || "note");
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [activityData, setActivityData] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateData = (key: string, value: unknown) => {
    setActivityData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (selectedChildren.length === 0) {
      setError("Please select at least one child");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        childIds: selectedChildren,
        type,
        data: activityData,
        photoUrl: photoUrl || undefined,
        occurredAt: new Date(occurredAt).toISOString(),
      });
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to create entry");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedChildren([]);
    setActivityData({});
    setPhotoUrl("");
    setError("");
    const now = new Date();
    setOccurredAt(now.toISOString().slice(0, 16));
  };

  const toggleChild = (childId: string) => {
    if (bulkMode) {
      setSelectedChildren((prev) =>
        prev.includes(childId)
          ? prev.filter((id) => id !== childId)
          : [...prev, childId]
      );
    } else {
      setSelectedChildren([childId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Activity Type */}
          {!defaultType && (
            <div>
              <Label>Activity Type</Label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {ACTIVITY_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      setActivityData({});
                    }}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      type === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <ActivityIcon type={t} className="h-4 w-4" />
                    {getActivityLabel(t)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Child Selector */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Child{bulkMode ? "ren" : ""}</Label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={bulkMode}
                  onCheckedChange={(checked) => {
                    setBulkMode(!!checked);
                    setSelectedChildren([]);
                  }}
                />
                Bulk mode
              </label>
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => toggleChild(child.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    selectedChildren.includes(child.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {child.firstName} {child.lastName}
                </button>
              ))}
            </div>
          </div>

          {/* Type-specific fields */}
          <TypeSpecificFields
            type={type}
            data={activityData}
            onChange={updateData}
          />

          {/* Time */}
          <div>
            <Label htmlFor="occurredAt">Time</Label>
            <Input
              id="occurredAt"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Photo URL */}
          <div>
            <Label htmlFor="photoUrl">Photo URL (optional)</Label>
            <Input
              id="photoUrl"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TypeSpecificFields({
  type,
  data,
  onChange,
}: {
  type: ActivityType;
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  switch (type) {
    case "meal":
      return (
        <div className="space-y-3">
          <div>
            <Label>Meal Type</Label>
            <Select
              value={(data.mealType as string) || ""}
              onValueChange={(v) => onChange("mealType", v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select meal type" />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount Eaten</Label>
            <Select
              value={(data.amountEaten as string) || ""}
              onValueChange={(v) => onChange("amountEaten", v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select amount" />
              </SelectTrigger>
              <SelectContent>
                {AMOUNT_EATEN.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="mealDescription">Description</Label>
            <Input
              id="mealDescription"
              value={(data.description as string) || ""}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="What was served..."
              className="mt-1"
            />
          </div>
        </div>
      );

    case "nap":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="napStart">Start Time</Label>
              <Input
                id="napStart"
                type="time"
                value={(data.startTime as string) || ""}
                onChange={(e) => onChange("startTime", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="napEnd">End Time</Label>
              <Input
                id="napEnd"
                type="time"
                value={(data.endTime as string) || ""}
                onChange={(e) => onChange("endTime", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Quality</Label>
            <Select
              value={(data.quality as string) || ""}
              onValueChange={(v) => onChange("quality", v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                {NAP_QUALITY.map((q) => (
                  <SelectItem key={q} value={q}>
                    {q.charAt(0).toUpperCase() + q.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "activity":
      return (
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select
              value={(data.category as string) || ""}
              onValueChange={(v) => onChange("category", v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="activityDescription">Description</Label>
            <Textarea
              id="activityDescription"
              value={(data.description as string) || ""}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="What did they do..."
              className="mt-1"
            />
          </div>
        </div>
      );

    case "mood":
      return (
        <div>
          <Label>Mood</Label>
          <Select
            value={(data.mood as string) || ""}
            onValueChange={(v) => onChange("mood", v)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select mood" />
            </SelectTrigger>
            <SelectContent>
              {MOODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "bathroom":
      return (
        <div>
          <Label>Type</Label>
          <Select
            value={(data.bathroomType as string) || ""}
            onValueChange={(v) => onChange("bathroomType", v)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {BATHROOM_TYPES.map((b) => (
                <SelectItem key={b} value={b}>
                  {b.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "incident":
      return (
        <div className="space-y-3">
          <div>
            <Label>Severity</Label>
            <Select
              value={(data.severity as string) || ""}
              onValueChange={(v) => onChange("severity", v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_SEVERITY.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="incidentDescription">Description</Label>
            <Textarea
              id="incidentDescription"
              value={(data.description as string) || ""}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="What happened..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="incidentAction">Action Taken</Label>
            <Textarea
              id="incidentAction"
              value={(data.actionTaken as string) || ""}
              onChange={(e) => onChange("actionTaken", e.target.value)}
              placeholder="What was done..."
              className="mt-1"
            />
          </div>
        </div>
      );

    case "milestone":
      return (
        <div className="space-y-3">
          <div>
            <Label htmlFor="milestoneTitle">Milestone</Label>
            <Input
              id="milestoneTitle"
              value={(data.title as string) || ""}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="e.g., First steps, Said first word..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="milestoneDescription">Details</Label>
            <Textarea
              id="milestoneDescription"
              value={(data.description as string) || ""}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="More details..."
              className="mt-1"
            />
          </div>
        </div>
      );

    case "photo":
    case "note":
    default:
      return (
        <div>
          <Label htmlFor="noteContent">Notes</Label>
          <Textarea
            id="noteContent"
            value={(data.content as string) || ""}
            onChange={(e) => onChange("content", e.target.value)}
            placeholder={type === "photo" ? "Caption..." : "Notes..."}
            className="mt-1"
          />
        </div>
      );
  }
}
