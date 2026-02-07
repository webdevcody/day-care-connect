import { useState } from "react";
import { StarRatingInput } from "./star-rating-input";
import { Button, Input, Textarea, Switch, Label } from "@daycare-hub/ui";

interface ReviewFormProps {
  initialData?: {
    overallRating: number;
    safetyRating?: number | null;
    staffRating?: number | null;
    activitiesRating?: number | null;
    valueRating?: number | null;
    title?: string | null;
    body?: string | null;
    wouldRecommend?: boolean | null;
  };
  onSubmit: (data: {
    overallRating: number;
    safetyRating?: number;
    staffRating?: number;
    activitiesRating?: number;
    valueRating?: number;
    title?: string;
    body?: string;
    wouldRecommend?: boolean;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ReviewForm({ initialData, onSubmit, onCancel, isSubmitting }: ReviewFormProps) {
  const [overallRating, setOverallRating] = useState(initialData?.overallRating ?? 0);
  const [safetyRating, setSafetyRating] = useState(initialData?.safetyRating ?? 0);
  const [staffRating, setStaffRating] = useState(initialData?.staffRating ?? 0);
  const [activitiesRating, setActivitiesRating] = useState(initialData?.activitiesRating ?? 0);
  const [valueRating, setValueRating] = useState(initialData?.valueRating ?? 0);
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [body, setBody] = useState(initialData?.body ?? "");
  const [wouldRecommend, setWouldRecommend] = useState(initialData?.wouldRecommend ?? true);
  const [showCategories, setShowCategories] = useState(
    !!(initialData?.safetyRating || initialData?.staffRating || initialData?.activitiesRating || initialData?.valueRating)
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (overallRating === 0) return;

    const data: Parameters<typeof onSubmit>[0] = {
      overallRating,
      title: title.trim() || undefined,
      body: body.trim() || undefined,
      wouldRecommend,
    };

    if (showCategories) {
      if (safetyRating > 0) data.safetyRating = safetyRating;
      if (staffRating > 0) data.staffRating = staffRating;
      if (activitiesRating > 0) data.activitiesRating = activitiesRating;
      if (valueRating > 0) data.valueRating = valueRating;
    }

    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <StarRatingInput
        value={overallRating}
        onChange={setOverallRating}
        label="Overall Rating"
        required
      />

      <div>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => setShowCategories(!showCategories)}
        >
          {showCategories ? "Hide specific ratings" : "Rate specific areas (optional)"}
        </button>
        {showCategories && (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <StarRatingInput value={safetyRating} onChange={setSafetyRating} label="Safety" />
            <StarRatingInput value={staffRating} onChange={setStaffRating} label="Staff" />
            <StarRatingInput value={activitiesRating} onChange={setActivitiesRating} label="Activities" />
            <StarRatingInput value={valueRating} onChange={setValueRating} label="Value" />
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="review-title">Title (optional)</Label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="Summarize your experience"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">{title.length}/100</p>
      </div>

      <div>
        <Label htmlFor="review-body">Your Review (optional)</Label>
        <Textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder="Share your experience with this facility..."
          rows={5}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">{body.length}/2000</p>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="recommend"
          checked={wouldRecommend}
          onCheckedChange={setWouldRecommend}
        />
        <Label htmlFor="recommend">Would you recommend this facility?</Label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={overallRating === 0 || isSubmitting}>
          {isSubmitting ? "Submitting..." : initialData ? "Update Review" : "Submit Review"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
