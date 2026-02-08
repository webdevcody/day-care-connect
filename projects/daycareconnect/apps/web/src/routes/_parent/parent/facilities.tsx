import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback, useEffect } from "react";
import { discoverSearchParamsSchema } from "@daycare-hub/shared";
import type { DiscoverSearchParams } from "@daycare-hub/shared";
import { useSession } from "@/lib/auth-client";
import { useSearchFacilities, useToggleFavorite } from "@daycare-hub/hooks";
import { SearchBar } from "@/components/discovery/search-bar";
import { FilterBar } from "@/components/discovery/filter-bar";
import { FacilityCard } from "@/components/discovery/facility-card";
import { FacilityCardSkeleton } from "@/components/discovery/facility-card-skeleton";
import { EmptyState } from "@/components/discovery/empty-state";

export const Route = createFileRoute("/_parent/parent/facilities")({
  validateSearch: (search) => discoverSearchParamsSchema.parse(search),
  component: BrowseFacilitiesPage,
});

function BrowseFacilitiesPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: "/parent/facilities" });
  const { data: session } = useSession();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const hasLocation = searchParams.lat != null && searchParams.lng != null;
  const hasSearchQuery = searchParams.name || searchParams.city || searchParams.q;
  const hasSearch = hasLocation || hasSearchQuery;

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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useSearchFacilities({
    lat: searchParams.lat,
    lng: searchParams.lng,
    radius: searchParams.radius ?? 25,
    name: searchParams.name || (searchParams.q && !searchParams.lat ? searchParams.q : undefined),
    city: searchParams.city || (searchParams.q && !searchParams.lat ? searchParams.q : undefined),
    age: searchParams.age,
    maxPrice: searchParams.maxPrice,
    services: searchParams.services,
    available: searchParams.available,
    openBefore: searchParams.openBefore,
    sort: searchParams.sort ?? (searchParams.lat && searchParams.lng ? "distance" : "name"),
    limit: hasSearch ? 12 : 10,
  });

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasSearch) return;

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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, hasSearch]);

  // Favorite toggle mutation with optimistic updates
  const favoriteMutation = useToggleFavorite();

  const handleSearch = useCallback(
    (location: { lat?: number; lng?: number; query: string }) => {
      if (location.lat !== undefined && location.lng !== undefined) {
        // Location-based search
        updateParams({ lat: location.lat, lng: location.lng, q: location.query });
      } else {
        // Text-based search
        updateParams({ name: location.query, q: location.query });
      }
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Browse Facilities</h1>
        <p className="mt-1 text-muted-foreground">
          Search and filter daycare facilities to find the perfect match for your child.
        </p>
      </div>

      {/* Search Bar */}
      <SearchBar
        initialQuery={searchParams.q}
        onSearch={handleSearch}
        onNearMe={handleNearMe}
        isGeocoding={isGeocoding}
      />

      {/* Filters */}
      {hasSearch && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <FilterBar params={searchParams} onChange={updateParams} />
        </div>
      )}

      {/* Result count */}
      {hasSearch && !isLoading && (
        <p className="text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? "facility" : "facilities"} found
          {searchParams.q && (
            <>
              {" "}
              {hasLocation ? "near" : "matching"} "{searchParams.q}"
            </>
          )}
        </p>
      )}

      {/* Facilities List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <FacilityCardSkeleton key={i} />
          ))}
        </div>
      ) : allFacilities.length === 0 ? (
        <EmptyState hasLocation={hasLocation} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allFacilities.map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
          {/* Infinite scroll sentinel */}
          {hasSearch && (
            <div ref={sentinelRef} className="py-4 text-center">
              {isFetchingNextPage && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <FacilityCardSkeleton />
                  <FacilityCardSkeleton />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
