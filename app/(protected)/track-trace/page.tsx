"use client";
import React, { Suspense, useState, useEffect, useMemo } from "react";
import FleetMap from "@/components/maps/FleetMap";
import type { Vehicle, RoutePoint } from "@/lib/mapTypes";
import { getLiveTrackingData } from "@/services/liveTrackingService";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
// ...existing code...
// ...existing code...
// ...existing code...

// Google Maps Button Overlay (must be top-level, before export default)
function GoogleMapsButton({
  vehicleNo,
  fetchVehicles,
}: {
  vehicleNo: string;
  fetchVehicles: () => Promise<Vehicle[]>;
}) {
  const [latLng, setLatLng] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  React.useEffect(() => {
    fetchVehicles().then((vehicles) => {
      if (vehicles && vehicles[0] && vehicles[0].lat && vehicles[0].lng) {
        setLatLng({ lat: vehicles[0].lat, lng: vehicles[0].lng });
      }
    });
  }, [vehicleNo, fetchVehicles]);
  if (!latLng) return null;
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${latLng.lat},${latLng.lng}`;
  return (
    <a
      href={gmapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Open in Google Maps"
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        zIndex: 10,
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px #0002",
        padding: "7px 14px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontWeight: 600,
        color: "#4285F4",
        textDecoration: "none",
        fontSize: 15,
        transition: "background 0.2s",
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = "#F1F3F4")}
      onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
    >
      <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="24" fill="#fff" />
        <path
          d="M24 8C17.373 8 12 13.373 12 20c0 7.732 10.5 19.5 11.121 20.207a2 2 0 0 0 2.758 0C25.5 39.5 36 27.732 36 20c0-6.627-5.373-12-12-12zm0 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"
          fill="#4285F4"
        />
      </svg>
      Google Maps
    </a>
  );
}

// Info Card component for the left panel
function LeftInfoCard({
  fetchVehicles,
  vehicleNo,
}: {
  fetchVehicles: () => Promise<Vehicle[]>;
  vehicleNo: string;
}) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    let timer: any;
    const getData = async () => {
      const vehicles = await fetchVehicles();
      setVehicle(vehicles && vehicles.length > 0 ? vehicles[0] : null);
    };
    getData();
    timer = setInterval(getData, 3000);
    return () => clearInterval(timer);
  }, [fetchVehicles]);

  const cardBg = "#181A20";
  const cardRadius = 20;
  const cardShadow = "0 4px 24px #0002";
  const accent = "#00FF85";
  const faded = "#b3b3b3";
  const border = "#23242a";

  // Responsive and height matching styles
  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 400,
    height: "60vh",
    minHeight: 340,
    background: cardBg,
    borderRadius: cardRadius,
    boxShadow: cardShadow,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    color: "#fff",
    marginBottom: 24,
    boxSizing: "border-box",
  };

  return (
    <div style={cardStyle}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: accent,
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        LIVE TRACKING
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#fff",
          marginBottom: 2,
        }}
      >
        {vehicle?.vehicleNo ?? vehicleNo}
      </div>
      <div style={{ fontSize: 12, color: faded, marginBottom: 2 }}>
        ACTUAL SPEED
      </div>
      <div
        style={{
          fontSize: 38,
          fontWeight: 900,
          color: accent,
          marginBottom: 8,
          lineHeight: 1,
        }}
      >
        {vehicle?.speed !== undefined && vehicle?.speed !== null
          ? vehicle.speed
          : "-"}
        <span
          style={{
            fontSize: 18,
            color: accent,
            fontWeight: 700,
            marginLeft: 4,
          }}
        >
          KM/H
        </span>
      </div>
      <div style={{ fontSize: 13, color: faded, marginBottom: 2 }}>
        IMEI:{" "}
        <span style={{ color: "#fff" }}>
          {vehicle?.imei ||
            vehicle?.IMEI ||
            vehicle?.deviceImei ||
            vehicle?.DeviceIMEI ||
            vehicle?.deviceNo ||
            "-"}
        </span>
      </div>
      <div style={{ fontSize: 13, color: faded, marginBottom: 2 }}>
        Ignition:{" "}
        <span style={{ color: accent }}>
          {vehicle?.ignition !== undefined
            ? vehicle.ignition
              ? "ON"
              : "OFF"
            : vehicle?.Ignition !== undefined
              ? vehicle.Ignition
                ? "ON"
                : "OFF"
              : vehicle?.ign !== undefined
                ? vehicle.ign
                  ? "ON"
                  : "OFF"
                : "-"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 2 }}>
        <div style={{ fontSize: 13, color: faded }}>
          HEADING
          <br />
          <span style={{ color: "#fff", fontWeight: 700 }}>
            {vehicle?.heading ?? vehicle?.Direction ?? "-"}
          </span>
        </div>
        <div style={{ fontSize: 13, color: faded }}>
          LAT/LNG
          <br />
          <span style={{ color: "#fff", fontWeight: 700 }}>
            {vehicle?.lat && vehicle?.lng
              ? `${vehicle.lat.toFixed(5)}, ${vehicle.lng.toFixed(5)}`
              : "-"}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 13, color: faded, marginBottom: 2 }}>
        LAST UPDATE
        <br />
        <span style={{ color: "#fff", fontWeight: 700 }}>
          {vehicle?.timestamp ?? vehicle?.GpsDate ?? "-"}
        </span>
      </div>
      <div style={{ fontSize: 13, color: faded, marginBottom: 2 }}>
        LAST POSITIONS
        <br />
        <span style={{ color: "#fff", fontWeight: 700 }}>
          {vehicle?.lastPositions?.length
            ? `${vehicle.lastPositions[0].lat?.toFixed(5)}, ${vehicle.lastPositions[0].lng?.toFixed(5)}`
            : vehicle?.lat && vehicle?.lng
              ? `${vehicle.lat.toFixed(5)}, ${vehicle.lng.toFixed(5)}`
              : "-"}
        </span>
      </div>
    </div>
  );
}

function toNum(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function firstNonEmpty(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function toIgnitionBoolean(value: any): boolean | undefined {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized === "true" || normalized === "on") {
      return true;
    }
    if (normalized === "0" || normalized === "false" || normalized === "off") {
      return false;
    }
  }
  return undefined;
}

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
  if (lat === undefined || lng === undefined || (lat === 0 && lng === 0))
    return null;
  const id =
    firstNonEmpty(
      item.vehicleNo,
      item.vehicleNumber,
      item.registrationNo,
      item.registrationNumber,
      item.deviceNo,
      item.imei,
      item.id,
      item.deviceId,
    ) ||
    `${lat},${lng}`;
  // Try to extract vehicleNo from id if not present
  let vehicleNo = firstNonEmpty(
    item.vehicleNo,
    item.vehicleNumber,
    item.registrationNo,
    item.registrationNumber,
    item.vehicleno,
  );
  if (
    !vehicleNo &&
    typeof id === "string" &&
    /^[A-Z]{2}\d{1,2}[A-Z]{1,2}\d{4,5}$/i.test(id)
  ) {
    vehicleNo = id;
  }
  return {
    ...item,
    id,
    name: String(vehicleNo || id),
    vehicleNo,
    lat,
    lng,
    speed: toNum(item.speed ?? item.Speed),
    heading: toNum(
      firstNonEmpty(
        item.direction,
        item.heading,
        item.Dir,
        item.bearing,
        item.course,
      ),
    ),
    timestamp: firstNonEmpty(
      item.receivedAt,
      item.gpsDate,
      item.timestamp,
      item.gpsTime,
      item.updatedAt,
      item.lastUpdate,
    ),
    status:
      toIgnitionBoolean(firstNonEmpty(item.ignition, item.Ignition, item.ign)) ===
      true
        ? "ignition-on"
        : "ignition-off",
    imei: firstNonEmpty(
      item.imei,
      item.IMEI,
      item.deviceImei,
      item.DeviceIMEI,
      item.deviceNo,
    ),
    ignition: toIgnitionBoolean(
      firstNonEmpty(item.ignition, item.Ignition, item.ign),
    ),
  };
}

async function fetchVehicles(): Promise<Vehicle[]> {
  return [];
}

async function fetchSelectedVehicle(vehicleNo: string): Promise<Vehicle[]> {
  if (!vehicleNo) {
    return [];
  }
  try {
    const redisKey = `dashboard::${vehicleNo}`;
    let data = await getLiveTrackingData(redisKey);
    if (data && typeof data === "object" && "ok" in data && "data" in data)
      data = data.data;
    if (
      data &&
      typeof data === "object" &&
      data.value &&
      typeof data.value === "string"
    ) {
      try {
        data = JSON.parse(data.value);
      } catch {
        return [];
      }
    }
    const arr = Array.isArray(data) ? data : [data];
    return arr
      .map(normalizeVehicle)
      .filter((v: Vehicle | null): v is Vehicle => v !== null);
  } catch {
    return [];
  }
}

async function fetchRoute(vehicleId: string): Promise<RoutePoint[]> {
  const baseUrl =
    process.env.NEXT_PUBLIC_VTS_API_PROXY_BASE_URL || "/vts-proxy";
  const res = await fetch(
    `${baseUrl}/api/vehicles/${encodeURIComponent(vehicleId)}/route`,
    { cache: "no-store" },
  );
  return await res.json();
}

const STATUS_CATEGORIES = [
  { key: "all", label: "All", icon: "🚗" },
  { key: "moving", label: "Moving", icon: "➡️" },
  { key: "idling", label: "Idling", icon: "🕒" },
  { key: "parked", label: "Parked", icon: "🅿️" },
  { key: "offline", label: "Offline", icon: "⛔" },
  { key: "breakdown", label: "Breakdown", icon: "🔧" },
  { key: "expired", label: "Expired", icon: "⏰" },
];

function getStatusCounts(vehicles: Vehicle[]) {
  const counts: Record<string, number> = {
    all: vehicles.length,
    moving: 0,
    idling: 0,
    parked: 0,
    offline: 0,
    breakdown: 0,
    expired: 0,
  };
  vehicles.forEach((v) => {
    if (v.status === "moving") counts.moving++;
    else if (v.status === "idling") counts.idling++;
    else if (v.status === "parked") counts.parked++;
    else if (v.status === "offline") counts.offline++;
    else if (v.status === "breakdown") counts.breakdown++;
    else if (v.status === "expired") counts.expired++;
  });
  return counts;
}

function TrackTracePageContent() {
  // Use FleetMap and useVehiclesLive for live polling
  const { isDark } = useTheme();
  const searchParams = useSearchParams();

  // Get vehicleNo from query param
  const vehicleNo =
    searchParams.get("vehicleNo") ||
    searchParams.get("vehicle") ||
    searchParams.get("plate") ||
    "";

  // Fetch only the selected vehicle for live tracking
  async function fetchVehicles(): Promise<Vehicle[]> {
    return fetchSelectedVehicle(vehicleNo);
  }

  async function fetchRoute(vehicleId: string): Promise<RoutePoint[]> {
    const baseUrl =
      process.env.NEXT_PUBLIC_VTS_API_PROXY_BASE_URL || "/vts-proxy";
    const res = await fetch(
      `${baseUrl}/api/vehicles/${encodeURIComponent(vehicleId)}/route`,
      { cache: "no-store" },
    );
    return await res.json();
  }

  // No vehicles state in parent; FleetMap manages vehicles internally

  return (
    <div className={`${isDark ? "dark" : ""}`}>
      <div
        className={`min-h-screen ${isDark ? "bg-background" : "bg-gray-50"} p-6`}
      >
        <div className="max-w-7xl mx-auto mb-6">
          <PageHeader
            title="Track & Trace"
            subtitle="Track, monitor, and manage your fleet in real time."
            breadcrumbs={[
              { label: "Operations" },
              { label: "Track & Trace" },
            ]}
            showButton={false}
            showExportButton={false}
            showFilterButton={false}
            showBulkUpload={false}
          />
        </div>
        <div className="max-w-7xl mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>
          {/* Status Cards and Filter/Search Row */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 300, display: "flex", gap: 12 }}>
              <div
                style={{
                  background: "#F4F4F6",
                  borderRadius: 12,
                  padding: "10px 22px",
                  minWidth: 120,
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#222",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {vehicleNo ? 1 : 0}
                </div>
                <div>{vehicleNo ? "SELECTED" : "NO VEHICLE"}</div>
              </div>
            </div>
            <div
              style={{
                minWidth: 220,
                maxWidth: 320,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
              }}
            >
              <input
                type="text"
                placeholder={vehicleNo || "Open this page from a real vehicle"}
                value={vehicleNo}
                readOnly
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #E0E0E0",
                  fontSize: 15,
                  outline: "none",
                }}
              />
              <button
                style={{
                  background: "#fff",
                  border: "1px solid #E0E0E0",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#222",
                  cursor: "pointer",
                }}
              >
                Filter
              </button>
            </div>
          </div>
          {/* Main Content: Info Card & Map */}
          <div style={{ display: "flex", gap: 24 }}>
            {/* Left: Info Card */}
            <LeftInfoCard fetchVehicles={fetchVehicles} vehicleNo={vehicleNo} />
            {/* Right: Map Section */}
            <div style={{ flex: 1, position: "relative" }}>
              <div
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 2px 12px #0001",
                  position: "relative",
                }}
              >
                {/* Google Maps Button Overlay */}
                <GoogleMapsButton
                  vehicleNo={vehicleNo}
                  fetchVehicles={fetchVehicles}
                />
                <FleetMap
                  fetchVehicles={fetchVehicles}
                  fetchRoute={fetchRoute}
                  pollMs={3000}
                  height="60vh"
                />
                {!vehicleNo && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255,255,255,0.85)",
                      fontWeight: 600,
                      color: "#475569",
                      zIndex: 5,
                    }}
                  >
                    No vehicle selected.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackTracePage() {
  return (
    <Suspense
      fallback={<div style={{ padding: 24 }}>Loading track trace...</div>}
    >
      <TrackTracePageContent />
    </Suspense>
  );
}
