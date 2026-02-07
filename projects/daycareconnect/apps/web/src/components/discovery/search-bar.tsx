import { useState } from "react";
import { Input, Button } from "@daycare-hub/ui";

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (location: { lat: number; lng: number; query: string }) => void;
  onNearMe: () => void;
  isGeocoding: boolean;
}

export function SearchBar({ initialQuery, onSearch, onNearMe, isGeocoding }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=1`,
        { headers: { "User-Agent": "DayCareConnect/1.0" } }
      );
      const results = await res.json();
      if (results.length > 0) {
        onSearch({
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
          query: query.trim(),
        });
      }
    } catch {
      // geocoding failed silently
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="Search by city, address, or zip code..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" disabled={isGeocoding || !query.trim()}>
        {isGeocoding ? "Searching..." : "Search"}
      </Button>
      <Button type="button" variant="outline" onClick={onNearMe} disabled={isGeocoding}>
        Near Me
      </Button>
    </form>
  );
}
