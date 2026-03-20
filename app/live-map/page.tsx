"use client";

import FleetMap from "@/components/maps/FleetMap";
import type { RoutePoint, Vehicle } from "@/lib/mapTypes";
import { getLiveTrackingBatch } from "@/services/liveTrackingService";

// ----------------------------------------------------------
// Helper: safely convert to number
// ----------------------------------------------------------
function toNum(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toIgnitionStatus(value: any): "ignition-on" | "ignition-off" {
  if (value === true || value === 1) return "ignition-on";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized === "true" || normalized === "on") {
      return "ignition-on";
    }
  }
  return "ignition-off";
}

// ----------------------------------------------------------
// NORMALIZER — Handles ALL field variations & nested formats
// ----------------------------------------------------------
function normalizeVehicle(item: any): Vehicle | null {
  // ---- Handle latitude field variations ----
  const lat =
    toNum(item.latitude) ??
    toNum(item.lat) ??
    toNum(item.Latitude) ??
    toNum(item.Lat) ??
    toNum(item.LAT);

  // ---- Handle longitude field variations ----
  const lng =
    toNum(item.longitude) ??
    toNum(item.lng) ??
    toNum(item.lon) ??
    toNum(item.Longitude) ??
    toNum(item.Lng) ??
    toNum(item.LNG);

  // Skip invalid or 0,0 coordinates
  if (lat === undefined || lng === undefined || (lat === 0 && lng === 0)) {
    console.warn("Skipping invalid vehicle with bad coordinates:", item);
    return null;
  }

  // ---- Create a stable ID ----
  const id =
    item.vehicleNo ||
    item.deviceNo ||
    item.imei ||
    item.id ||
    item.deviceId ||
    `${lat},${lng}`;

  return {
    ...item,
    id,
    name: id,
    lat,
    lng,
    speed: toNum(item.speed ?? item.Speed),
    heading: toNum(item.direction ?? item.heading ?? item.Dir ?? item.bearing),
    timestamp: item.gpsDate ?? item.timestamp ?? item.gpsTime,
    status: toIgnitionStatus(item.ignition ?? item.Ignition ?? item.ign),
  };
}

// ----------------------------------------------------------
// Fetch & Normalize Vehicles from Redis
// ----------------------------------------------------------
async function fetchVehicles(): Promise<Vehicle[]> {
  try {
    const normalizedVehicles: Array<Vehicle | null> =
      (await getLiveTrackingBatch()).map(normalizeVehicle);

    return normalizedVehicles.filter(
      (vehicle: Vehicle | null): vehicle is Vehicle => vehicle !== null,
    );
  } catch (err) {
    console.error("Error fetching live tracking data:", err);
    return [];
  }
}

// ----------------------------------------------------------
// Fetch route history (unchanged)
// ----------------------------------------------------------
async function fetchRoute(vehicleId: string): Promise<RoutePoint[]> {
  const baseUrl =
    process.env.NEXT_PUBLIC_VTS_API_PROXY_BASE_URL || "/vts-proxy";
  const res = await fetch(
    `${baseUrl}/api/vehicles/${encodeURIComponent(vehicleId)}/route`,
    { cache: "no-store" },
  );

  const data = await res.json();
  return data;
}

// ----------------------------------------------------------
// Component
// ----------------------------------------------------------
export default function FleetPage() {
  return (
    <FleetMap
      fetchVehicles={fetchVehicles}
      fetchRoute={fetchRoute}
      pollMs={3000}
      height="80vh"
    />
  );
}
