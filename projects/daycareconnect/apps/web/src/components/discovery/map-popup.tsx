import { Link } from "@tanstack/react-router";

interface MapPopupProps {
  facility: {
    id: string;
    name: string;
    monthlyRate: string | null;
    distance: number;
    primaryPhotoUrl: string | null;
  };
}

export function MapPopup({ facility }: MapPopupProps) {
  return (
    <div className="w-48">
      {facility.primaryPhotoUrl && (
        <img
          src={facility.primaryPhotoUrl}
          alt={facility.name}
          className="mb-2 aspect-video w-full rounded object-cover"
        />
      )}
      <h4 className="text-sm font-semibold">{facility.name}</h4>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        {facility.monthlyRate && <span>${facility.monthlyRate}/mo</span>}
        {facility.distance != null && <span>{facility.distance.toFixed(1)} mi</span>}
      </div>
      <Link
        to="/facilities/$facilityId"
        params={{ facilityId: facility.id }}
        className="mt-2 block text-center text-xs font-medium text-primary hover:underline"
      >
        View Profile
      </Link>
    </div>
  );
}
