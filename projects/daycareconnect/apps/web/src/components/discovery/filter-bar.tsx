import { Label, Slider, Checkbox, Button } from "@daycare-hub/ui";
import { FACILITY_SERVICES_SUGGESTIONS } from "@daycare-hub/shared";
import type { DiscoverSearchParams } from "@daycare-hub/shared";

interface FilterBarProps {
  params: DiscoverSearchParams;
  onChange: (updates: Partial<DiscoverSearchParams>) => void;
}

export function FilterBar({ params, onChange }: FilterBarProps) {
  const selectedServices = params.services || [];

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Age Filter */}
      <div className="w-32">
        <Label className="text-xs">Child Age</Label>
        <div className="mt-1 flex items-center gap-2">
          <Slider
            min={0}
            max={18}
            step={1}
            value={params.age !== undefined ? [params.age] : [5]}
            onValueChange={([v]) => onChange({ age: v })}
          />
          <span className="w-8 text-xs text-muted-foreground">
            {params.age !== undefined ? params.age : "Any"}
          </span>
        </div>
      </div>

      {/* Max Price */}
      <div className="w-40">
        <Label className="text-xs">Max Monthly Price</Label>
        <div className="mt-1 flex items-center gap-2">
          <Slider
            min={0}
            max={3000}
            step={50}
            value={[params.maxPrice ?? 3000]}
            onValueChange={([v]) => onChange({ maxPrice: v < 3000 ? v : undefined })}
          />
          <span className="w-14 text-xs text-muted-foreground">
            {params.maxPrice !== undefined ? `$${params.maxPrice}` : "Any"}
          </span>
        </div>
      </div>

      {/* Services */}
      <div>
        <Label className="text-xs">Services</Label>
        <div className="mt-1 flex flex-wrap gap-2">
          {FACILITY_SERVICES_SUGGESTIONS.slice(0, 5).map((service) => (
            <label key={service} className="flex items-center gap-1 text-xs">
              <Checkbox
                checked={selectedServices.includes(service)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...selectedServices, service]
                    : selectedServices.filter((s) => s !== service);
                  onChange({ services: next.length > 0 ? next : undefined });
                }}
              />
              {service}
            </label>
          ))}
        </div>
      </div>

      {/* Availability */}
      <label className="flex items-center gap-1.5 text-xs">
        <Checkbox
          checked={params.available || false}
          onCheckedChange={(checked) => onChange({ available: checked === true || undefined })}
        />
        Has openings
      </label>

      {/* Sort */}
      <div>
        <Label className="text-xs">Sort by</Label>
        <select
          className="mt-1 block rounded-md border border-input bg-background px-2 py-1 text-xs"
          value={params.sort || "distance"}
          onChange={(e) => onChange({ sort: e.target.value as DiscoverSearchParams["sort"] })}
        >
          <option value="distance">Distance</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {/* Reset */}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={() =>
          onChange({
            age: undefined,
            maxPrice: undefined,
            services: undefined,
            available: undefined,
            openBefore: undefined,
            sort: undefined,
          })
        }
      >
        Reset Filters
      </Button>
    </div>
  );
}
