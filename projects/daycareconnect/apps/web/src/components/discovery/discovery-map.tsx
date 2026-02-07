import { useState, useCallback } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPopup } from "./map-popup";

interface MapFacility {
  id: string;
  name: string;
  latitude: string | null;
  longitude: string | null;
  monthlyRate: string | null;
  distance: number;
  primaryPhotoUrl: string | null;
}

interface DiscoveryMapProps {
  facilities: MapFacility[];
  center: { lat: number; lng: number };
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
}

export function DiscoveryMap({ facilities, center, onBoundsChange }: DiscoveryMapProps) {
  const [selectedFacility, setSelectedFacility] = useState<MapFacility | null>(null);

  const handleMoveEnd = useCallback(
    (evt: any) => {
      if (!onBoundsChange) return;
      const bounds = evt.target.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    },
    [onBoundsChange]
  );

  return (
    <Map
      initialViewState={{
        latitude: center.lat,
        longitude: center.lng,
        zoom: 11,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      onMoveEnd={handleMoveEnd}
    >
      <NavigationControl position="top-right" />
      {facilities.map((f) => {
        if (!f.latitude || !f.longitude) return null;
        return (
          <Marker
            key={f.id}
            latitude={parseFloat(f.latitude)}
            longitude={parseFloat(f.longitude)}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedFacility(f);
            }}
          >
            <div className="cursor-pointer text-2xl">📍</div>
          </Marker>
        );
      })}

      {selectedFacility && selectedFacility.latitude && selectedFacility.longitude && (
        <Popup
          latitude={parseFloat(selectedFacility.latitude)}
          longitude={parseFloat(selectedFacility.longitude)}
          anchor="bottom"
          offset={30}
          onClose={() => setSelectedFacility(null)}
          closeOnClick={false}
        >
          <MapPopup facility={selectedFacility} />
        </Popup>
      )}
    </Map>
  );
}
