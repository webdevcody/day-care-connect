import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { APP_NAME, discoverSearchParamsSchema } from "@daycare-hub/shared";
import type { DiscoverSearchParams } from "@daycare-hub/shared";
import { useSession } from "@/lib/auth-client";
import { useSearchFacilities, useToggleFavorite } from "@daycare-hub/hooks";
import { SearchBar } from "@/components/discovery/search-bar";
import { FilterBar } from "@/components/discovery/filter-bar";
import { FacilityCard } from "@/components/discovery/facility-card";
import { FacilityCardSkeleton } from "@/components/discovery/facility-card-skeleton";
import { ViewToggle } from "@/components/discovery/view-toggle";
import { EmptyState } from "@/components/discovery/empty-state";

const DiscoveryMap = lazy(() =>
  import("@/components/discovery/discovery-map").then((m) => ({ default: m.DiscoveryMap }))
);

export const Route = createFileRoute("/discover")({
  validateSearch: (search) => discoverSearchParamsSchema.parse(search),
  component: DiscoverPage,
});

function DiscoverPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: "/discover" });
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const hasLocation = searchParams.lat != null && searchParams.lng != null;
  const viewMode = searchParams.view || "split";

  const updateParams = useCallback(
    (updates: Partial<DiscoverSearchParams>) => {
      navigate({
        search: (prev: DiscoverSearchParams) => {
          const next = { ...prev, ...updates };
          // Remove undefined keys
          for (const key of Object.keys(next) as (keyof DiscoverSearchParams)[]) {
            if (next[key] === undefined) delete next[key];
          }
          // Reset page when filters change
          if (!("page" in updates)) delete next.page;
          return next;
        },
      });
    },
    [navigate]
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useSearchFacilities({
    lat: searchParams.lat,
    lng: searchParams.lng,
    radius: searchParams.radius ?? 25,
    age: searchParams.age,
    maxPrice: searchParams.maxPrice,
    services: searchParams.services,
    available: searchParams.available,
    openBefore: searchParams.openBefore,
    minRating: searchParams.minRating,
    sort: searchParams.sort ?? "distance",
    limit: 12,
  });

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Favorite toggle mutation with optimistic updates
  const favoriteMutation = useToggleFavorite();

  const handleSearch = useCallback(
    (location: { lat: number; lng: number; query: string }) => {
      updateParams({ lat: location.lat, lng: location.lng, q: location.query });
    },
    [updateParams]
  );

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGeocoding(false);
        updateParams({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          q: "My Location",
        });
      },
      () => setIsGeocoding(false),
      { timeout: 10000 }
    );
  }, [updateParams]);

  const handleToggleFavorite = useCallback(
    (facilityId: string) => {
      if (!session) return;
      favoriteMutation.mutate(facilityId);
    },
    [session, favoriteMutation]
  );

  const allFacilities = data?.pages.flatMap((p) => p.facilities) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="text-xl font-bold text-primary">
            {APP_NAME}
          </a>
          <div className="flex items-center gap-4">
            {session ? (
              <a href="/parent" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Dashboard
              </a>
            ) : (
              <>
                <a href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Login
                </a>
                <a
                  href="/register"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Register
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {/* Search Bar */}
        <SearchBar
          initialQuery={searchParams.q}
          onSearch={handleSearch}
          onNearMe={handleNearMe}
          isGeocoding={isGeocoding}
        />

        {/* Filters + View Toggle */}
        {hasLocation && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <FilterBar params={searchParams} onChange={updateParams} />
            <ViewToggle
              value={viewMode}
              onChange={(mode) => updateParams({ view: mode })}
            />
          </div>
        )}

        {/* Result count */}
        {hasLocation && !isLoading && (
          <p className="mt-3 text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? "facility" : "facilities"} found
            {searchParams.q && <> near "{searchParams.q}"</>}
          </p>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1">
        {!hasLocation ? (
          <div className="flex flex-1 items-center justify-center px-4">
            <EmptyState hasLocation={false} />
          </div>
        ) : (
          <div
            className={`flex flex-1 ${
              viewMode === "split"
                ? "flex-col lg:flex-row"
                : viewMode === "map"
                  ? "flex-col"
                  : "flex-col"
            }`}
          >
            {/* List Panel */}
            {(viewMode === "split" || viewMode === "list") && (
              <div
                className={`overflow-y-auto px-4 pb-8 sm:px-6 lg:px-8 ${
                  viewMode === "split" ? "lg:w-2/5" : "mx-auto w-full max-w-7xl"
                }`}
                style={viewMode === "split" ? { maxHeight: "calc(100vh - 220px)" } : undefined}
              >
                {isLoading ? (
                  <div
                    className={`grid gap-4 ${viewMode === "list" ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <FacilityCardSkeleton key={i} />
                    ))}
                  </div>
                ) : allFacilities.length === 0 ? (
                  <EmptyState hasLocation={true} />
                ) : (
                  <>
                    <div
                      className={`grid gap-4 ${viewMode === "list" ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}
                    >
                      {allFacilities.map((facility) => (
                        <FacilityCard
                          key={facility.id}
                          facility={facility}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      ))}
                    </div>
                    {/* Infinite scroll sentinel */}
                    <div ref={sentinelRef} className="py-4 text-center">
                      {isFetchingNextPage && (
                        <div className="grid gap-4">
                          <FacilityCardSkeleton />
                          <FacilityCardSkeleton />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Map Panel */}
            {(viewMode === "split" || viewMode === "map") && (
              <div
                className={`${
                  viewMode === "split" ? "lg:w-3/5" : "w-full"
                }`}
                style={{ minHeight: viewMode === "map" ? "calc(100vh - 220px)" : "400px", height: viewMode === "split" ? "calc(100vh - 220px)" : undefined }}
              >
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center bg-muted">
                      Loading map...
                    </div>
                  }
                >
                  <DiscoveryMap
                    facilities={allFacilities}
                    center={{ lat: searchParams.lat!, lng: searchParams.lng! }}
                  />
                </Suspense>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
