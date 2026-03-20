"use client";

import { useRef } from "react";
import FleetMap from "@/components/maps/FleetMap";
import type { Vehicle } from "@/lib/mapTypes";
import { getLiveTrackingBatch } from "@/services/liveTrackingService";

// Helper: safely convert to number
function toNum(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

// Normalizer for vehicle data (robust lat/lng extraction)
function normalizeVehicle(item: any): Vehicle | null {
  const lat =
    toNum(item.latitude) ??
    toNum(item.lat) ??
    toNum(item.Latitude) ??
    toNum(item.Lat) ??
    toNum(item.LAT);
  const lng =
    toNum(item.longitude) ??
    toNum(item.lng) ??
    toNum(item.lon) ??
    toNum(item.Longitude) ??
    toNum(item.Lng) ??
    toNum(item.LNG);
  if (lat === undefined || lng === undefined || (lat === 0 && lng === 0)) {
    console.warn(
      "[trackallvehicle] Skipping invalid vehicle with bad coordinates:",
      item,
    );
    return null;
  }
  const id =
    item.vehicleNo ||
    item.deviceNo ||
    item.imei ||
    item.id ||
    item.deviceId ||
    `${lat},${lng}`;
  return {
    id,
    name: id,
    lat,
    lng,
    speed: toNum(item.speed ?? item.Speed),
    heading: toNum(item.direction ?? item.heading ?? item.Dir ?? item.bearing),
    timestamp: item.gpsDate ?? item.timestamp ?? item.gpsTime,
    status: item.ignition ? "ignition-on" : "ignition-off",
    ...item,
  };
}

// Fetch all vehicles using the batch API and normalize
async function fetchAllVehicles(): Promise<Vehicle[]> {
  try {
    const data = await getLiveTrackingBatch();
    return data
      .map(normalizeVehicle)
      .filter((v: Vehicle | null) => v !== null) as Vehicle[];
  } catch {
    return [];
  }
}

export default function TrackAllVehiclePage() {
  // Track live route for each vehicle by id
  const liveRoutesRef = useRef<{
    [id: string]: { lat: number; lng: number }[];
  }>({});

  // Wrap fetchAllVehicles to update liveRoutesRef
  const fetchAndTrackVehicles = async () => {
    const vehicles = await fetchAllVehicles();
    console.log("[trackallvehicle] fetched vehicles:", vehicles);
    vehicles.forEach((v) => {
      console.log("[trackallvehicle] vehicle:", v.id, v.lat, v.lng);
      if (
        typeof v.lat === "number" &&
        typeof v.lng === "number" &&
        isFinite(v.lat) &&
        isFinite(v.lng)
      ) {
        if (!liveRoutesRef.current[v.id]) {
          liveRoutesRef.current[v.id] = [];
        }
        const route = liveRoutesRef.current[v.id];
        const last = route.length > 0 ? route[route.length - 1] : null;
        if (!last || last.lat !== v.lat || last.lng !== v.lng) {
          route.push({ lat: v.lat, lng: v.lng });
        }
      } else {
        console.warn(
          "[trackallvehicle] invalid lat/lng for vehicle:",
          v.id,
          v.lat,
          v.lng,
        );
      }
    });
    // Attach liveRoute to each vehicle
    return vehicles.map((v) => ({
      ...v,
      liveRoute: liveRoutesRef.current[v.id] || [],
    }));
  };

  return (
    <FleetMap
      fetchVehicles={fetchAndTrackVehicles}
      pollMs={3000}
      height="80vh"
    />
  );
}
