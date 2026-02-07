import { StarRating } from "./star-rating";
import { Card, CardContent, Badge, Button } from "@daycare-hub/ui";

interface ReviewResponse {
  id: string;
  body: string;
  responderName: string;
  createdAt: Date | string;
}

interface ReviewCardProps {
  review: {
    id: string;
    facilityId: string;
    parentId?: string;
    overallRating: number;
    safetyRating?: number | null;
    staffRating?: number | null;
    activitiesRating?: number | null;
    valueRating?: number | null;
    title?: string | null;
    body?: string | null;
    wouldRecommend?: boolean | null;
    isReported?: boolean;
    createdAt: Date | string;
    parentName?: string | null;
    facilityName?: string | null;
    response?: ReviewResponse | null;
  };
  isOwner?: boolean;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onRespond?: () => void;
  onEditResponse?: () => void;
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function abbreviateName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function ReviewCard({
  review,
  isOwner,
  isAdmin,
  onEdit,
  onDelete,
  onReport,
  onRespond,
  onEditResponse,
}: ReviewCardProps) {
  const categoryRatings = [
    { label: "Safety", value: review.safetyRating },
    { label: "Staff", value: review.staffRating },
    { label: "Activities", value: review.activitiesRating },
    { label: "Value", value: review.valueRating },
  ].filter((r) => r.value != null);

  return (
    <Card>
      <CardContent className="py-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {review.parentName ? abbreviateName(review.parentName) : "Anonymous"}
              </span>
              {review.facilityName && (
                <span className="text-sm text-muted-foreground">
                  at {review.facilityName}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <StarRating rating={review.overallRating} size="sm" />
              <span className="text-xs text-muted-foreground">
                {formatDate(review.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            {isOwner && (
              <>
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete}>
                  Delete
                </Button>
              </>
            )}
            {!isOwner && !isAdmin && (
              <Button variant="ghost" size="sm" onClick={onReport}>
                Report
              </Button>
            )}
          </div>
        </div>

        {/* Category ratings inline */}
        {categoryRatings.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {categoryRatings.map((r) => (
              <span key={r.label}>
                {r.label}: {r.value}/5
              </span>
            ))}
          </div>
        )}

        {/* Title + body */}
        {review.title && <p className="mt-2 font-semibold">{review.title}</p>}
        {review.body && (
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
            {review.body}
          </p>
        )}

        {/* Recommend badge */}
        {review.wouldRecommend != null && (
          <div className="mt-2">
            <Badge variant={review.wouldRecommend ? "default" : "secondary"}>
              {review.wouldRecommend ? "Would recommend" : "Would not recommend"}
            </Badge>
          </div>
        )}

        {review.isReported && isAdmin && (
          <Badge variant="destructive" className="mt-2">
            Reported
          </Badge>
        )}

        {/* Response */}
        {review.response && (
          <div className="mt-4 rounded-md border-l-2 border-primary/30 bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">
                Response from {review.response.responderName}
              </p>
              {isAdmin && onEditResponse && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onEditResponse}>
                  Edit
                </Button>
              )}
            </div>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
              {review.response.body}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(review.response.createdAt)}
            </p>
          </div>
        )}

        {/* Admin respond button */}
        {isAdmin && !review.response && onRespond && (
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={onRespond}>
              Respond
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
