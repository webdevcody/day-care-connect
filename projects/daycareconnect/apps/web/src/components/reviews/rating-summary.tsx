import { StarRating } from "./star-rating";
import { Card, CardContent } from "@daycare-hub/ui";

interface RatingSummaryProps {
  summary: {
    avgRating: number | null;
    totalCount: number;
    distribution: Record<number, number>;
    categoryAverages: {
      safety: number | null;
      staff: number | null;
      activities: number | null;
      value: number | null;
    } | null;
    recommendPercentage: number | null;
  };
  onFilterByRating?: (rating: number | undefined) => void;
}

export function RatingSummary({ summary, onFilterByRating }: RatingSummaryProps) {
  if (summary.totalCount === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No reviews yet.</p>
        </CardContent>
      </Card>
    );
  }

  const categories = summary.categoryAverages
    ? [
        { label: "Safety", value: summary.categoryAverages.safety },
        { label: "Staff", value: summary.categoryAverages.staff },
        { label: "Activities", value: summary.categoryAverages.activities },
        { label: "Value", value: summary.categoryAverages.value },
      ]
    : [];

  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {/* Left: average + stars */}
          <div className="flex flex-col items-center md:min-w-[140px]">
            <span className="text-4xl font-bold">{summary.avgRating?.toFixed(1)}</span>
            <StarRating rating={summary.avgRating ?? 0} size="md" />
            <p className="mt-1 text-sm text-muted-foreground">
              Based on {summary.totalCount} {summary.totalCount === 1 ? "review" : "reviews"}
            </p>
            {summary.recommendPercentage !== null && (
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.recommendPercentage}% would recommend
              </p>
            )}
          </div>

          {/* Center: distribution bars */}
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.distribution[star] || 0;
              const pct = summary.totalCount > 0 ? (count / summary.totalCount) * 100 : 0;
              return (
                <button
                  key={star}
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-accent"
                  onClick={() => onFilterByRating?.(star)}
                >
                  <span className="w-4 text-right text-muted-foreground">{star}</span>
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-yellow-400">
                    <path
                      fill="currentColor"
                      d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                    />
                  </svg>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-yellow-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Right: category averages */}
          {categories.length > 0 && (
            <div className="space-y-2 md:min-w-[160px]">
              <p className="text-sm font-medium">Category Ratings</p>
              {categories.map((cat) => (
                <div key={cat.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{cat.label}</span>
                  <span className="font-medium">{cat.value?.toFixed(1) ?? "–"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
