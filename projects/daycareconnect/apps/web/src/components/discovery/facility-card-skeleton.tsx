import { Card, CardContent } from "@daycare-hub/ui";

export function FacilityCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video w-full animate-pulse bg-muted" />
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-5 w-5 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex justify-between">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex gap-1">
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          <div className="h-5 w-14 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
