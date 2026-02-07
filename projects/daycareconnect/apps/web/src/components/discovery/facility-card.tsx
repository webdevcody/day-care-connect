import { Link } from "@tanstack/react-router";
import { Card, CardContent, Badge } from "@daycare-hub/ui";
import { StarRating } from "@/components/reviews/star-rating";

interface FacilityCardProps {
  facility: {
    id: string;
    name: string;
    city: string;
    state: string;
    distance: number;
    monthlyRate: string | null;
    ratingAverage: string | null;
    reviewCount: number;
    ageRangeMin: number;
    ageRangeMax: number;
    availableSpots: number;
    isFavorited: boolean;
    primaryPhotoUrl: string | null;
    services: string[];
  };
  onToggleFavorite: (facilityId: string) => void;
}

export function FacilityCard({ facility, onToggleFavorite }: FacilityCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <Link to="/facilities/$facilityId" params={{ facilityId: facility.id }} className="block">
        {facility.primaryPhotoUrl ? (
          <img
            src={facility.primaryPhotoUrl}
            alt={facility.name}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted">
            <span className="text-sm text-muted-foreground">No photo</span>
          </div>
        )}
      </Link>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <Link
            to="/facilities/$facilityId"
            params={{ facilityId: facility.id }}
            className="block flex-1"
          >
            <h3 className="font-semibold leading-tight">{facility.name}</h3>
            {facility.ratingAverage && (
              <div className="mt-0.5 flex items-center gap-1">
                <StarRating rating={parseFloat(facility.ratingAverage)} size="sm" />
                <span className="text-xs text-muted-foreground">
                  ({facility.reviewCount})
                </span>
              </div>
            )}
            <p className="mt-0.5 text-sm text-muted-foreground">
              {facility.city}, {facility.state}
              {facility.distance != null && (
                <span className="ml-1">
                  &middot; {facility.distance.toFixed(1)} mi
                </span>
              )}
            </p>
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(facility.id);
            }}
            className="ml-2 shrink-0 text-lg"
            aria-label={facility.isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            {facility.isFavorited ? "\u2764\uFE0F" : "\u2661"}
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-sm">
          {facility.monthlyRate && (
            <span className="font-medium">${facility.monthlyRate}/mo</span>
          )}
          <span className="text-muted-foreground">
            Ages {facility.ageRangeMin}-{facility.ageRangeMax}
          </span>
        </div>

        <div className="mt-1 text-xs text-muted-foreground">
          {facility.availableSpots > 0 ? (
            <span className="text-green-600">{facility.availableSpots} spots available</span>
          ) : (
            <span className="text-red-500">No openings</span>
          )}
        </div>

        {facility.services.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {facility.services.slice(0, 3).map((s) => (
              <Badge key={s} variant="secondary" className="text-xs">
                {s}
              </Badge>
            ))}
            {facility.services.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{facility.services.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
