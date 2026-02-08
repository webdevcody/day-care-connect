import { useState } from "react";
import { Input, Button } from "@daycare-hub/ui";

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (location: { lat?: number; lng?: number; query: string }) => void;
  onNearMe: () => void;
  isGeocoding: boolean;
}

export function SearchBar({ initialQuery, onSearch, onNearMe, isGeocoding }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery || "");
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      // Try to geocode the query to get coordinates
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=1`,
        { headers: { "User-Agent": "DayCareConnect/1.0" } }
      );
      const results = await res.json();
      if (results.length > 0) {
        // If geocoding succeeds, use location-based search
        onSearch({
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
          query: query.trim(),
        });
      } else {
        // If geocoding fails or no results, use text-based search
        onSearch({
          query: query.trim(),
        });
      }
    } catch {
      // If geocoding fails, use text-based search
      onSearch({
        query: query.trim(),
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="Search by name, city, address, or zip code..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" disabled={isGeocoding || isSearching || !query.trim()}>
        {isGeocoding || isSearching ? "Searching..." : "Search"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onNearMe}
        disabled={isGeocoding || isSearching}
      >
        Near Me
      </Button>
    </form>
  );
}
