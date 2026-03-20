"use client";

import React, { useMemo, useState } from "react";
import type { RoutePoint, Vehicle } from "@/lib/mapTypes";
import { useRoutePlayback } from "./hooks/useRoutePlayback";
import { useVehiclesLive } from "./hooks/useVehiclesLive";
import MapLoader from "./MapLoader";
import PlaybackControls from "./PlaybackControls";
import VehicleMap from "./VehicleMap";

type Props = {
  fetchVehicles: () => Promise<Vehicle[]>;
  fetchRoute?: (vehicleId: string) => Promise<RoutePoint[]>;
  pollMs?: number;
  height?: string;
  renderInfoCard?: (vehicle: Vehicle | undefined) => React.ReactNode;
};

export default function FleetMap({
  fetchVehicles,
  fetchRoute,
  pollMs = 3000,
  height = "80vh",
  renderInfoCard,
}: Props) {
  const { vehicles } = useVehiclesLive(fetchVehicles, { pollMs });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [liveRoute, setLiveRoute] = useState<{ lat: number; lng: number }[]>(
    [],
  );

  // Track all positions for the first vehicle since live tracking started
  React.useEffect(() => {
    if (vehicles.length > 0) {
      setLiveRoute((prev) => {
        const last = prev.length > 0 ? prev[prev.length - 1] : null;
        const curr = { lat: vehicles[0].lat, lng: vehicles[0].lng };
        if (!last || last.lat !== curr.lat || last.lng !== curr.lng) {
          return [...prev, curr];
        }
        return prev;
      });
    }
  }, [vehicles]);

  // playback
  const { isPlaying, progress, current, play, pause, seek } = useRoutePlayback(
    route,
    1,
  );

  const runner = useMemo(() => {
    if (isPlaying && current) {
      return { lat: current.lat, lng: current.lng, heading: current.heading };
    }
    // If not playing back a route, use the latest live vehicle position
    if (vehicles.length > 0) {
      return {
        lat: vehicles[0].lat,
        lng: vehicles[0].lng,
        heading: vehicles[0].heading,
      };
    }
    return null;
  }, [isPlaying, current, vehicles]);

  // Compute map bounds for all vehicles
  const mapBounds = useMemo(() => {
    if (vehicles.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      vehicles.forEach((v) => {
        if (
          typeof v.lat === "number" &&
          typeof v.lng === "number" &&
          isFinite(v.lat) &&
          isFinite(v.lng)
        ) {
          bounds.extend({ lat: v.lat, lng: v.lng });
        }
      });
      // If at least one valid vehicle, return bounds
      if (!bounds.isEmpty()) return bounds;
    }
    return null;
  }, [vehicles]);

  const mapCenter = useMemo(() => {
    if (runner) return { lat: runner.lat, lng: runner.lng };
    if (vehicles.length) return { lat: vehicles[0].lat, lng: vehicles[0].lng };
    return { lat: 20.5937, lng: 78.9629 };
  }, [runner, vehicles]);

  const onVehicleClick = async (v: Vehicle) => {
    setSelectedVehicleId(v.id);

    if (!fetchRoute) return;

    // stop playback when switching
    pause();

    const r = await fetchRoute(v.id);
    setRoute(r || []);
  };

  return (
    <MapLoader>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {renderInfoCard && <div>{renderInfoCard(vehicles[0])}</div>}
        <VehicleMap
          vehicles={vehicles}
          route={route}
          runner={runner}
          center={mapCenter}
          zoom={12}
          height={height}
          onVehicleClick={onVehicleClick}
          liveRoute={liveRoute}
          bounds={mapBounds}
        />
        {route?.length > 1 && (
          <PlaybackControls
            isPlaying={isPlaying}
            progress={progress}
            onPlay={play}
            onPause={pause}
            onSeek={seek}
          />
        )}
        {selectedVehicleId && (
          <div style={{ padding: "0 12px", opacity: 0.8 }}>
            Selected: <b>{selectedVehicleId}</b> (click another vehicle to load
            route)
          </div>
        )}
      </div>
    </MapLoader>
  );
}
