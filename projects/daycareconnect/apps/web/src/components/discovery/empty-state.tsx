interface EmptyStateProps {
  hasLocation: boolean;
}

export function EmptyState({ hasLocation }: EmptyStateProps) {
  if (!hasLocation) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl">🔍</div>
        <h2 className="mt-4 text-xl font-semibold">Find Daycares Near You</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Search by city, address, or zip code to discover nearby daycare facilities. You can also
          use the "Near Me" button to search your current location.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl">📭</div>
      <h2 className="mt-4 text-xl font-semibold">No Facilities Found</h2>
      <p className="mt-2 max-w-md text-muted-foreground">
        We couldn't find any daycare facilities matching your criteria. Try expanding your search
        radius, adjusting your filters, or searching a different location.
      </p>
    </div>
  );
}
