"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap, MarkerF, PolylineF } from "@react-google-maps/api";
import {
  Navigation,
  Gauge,
  Phone,
  User,
  Layers3,
  Settings,
  Maximize2,
  Zap,
  Activity,
  AlertTriangle,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useGoogleMapsSdk } from "@/hooks/useGoogleMapsSdk";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { getLiveTrackingBatch } from "@/services/liveTrackingService";
import { getCarMarkerSvg } from "@/utils/carMarkerIcon";

const POLL_INTERVAL = 5000; // 5 seconds

interface Position {
  lat: number;
  lng: number;
  timestamp: string | number[] | number | null;
}

interface VehicleData {
  DeviceNo: string;
  Imei: string;
  Latitude: number;
  Longitude: number;
  Speed: number;
  Altitude: number;
  Direction: number;
  Rpm: number | null;
  Ignition: boolean;
  Ac: boolean;
  PowerCut: boolean;
  LowVoltage: boolean;
  DoorLock: boolean;
  DoorOpen: boolean;
  DeviceLock: boolean;
  FuelCut: boolean;
  GpsFixed: boolean;
  Collision: boolean;
  Sos: boolean;
  OverSpeed: boolean;
  Fatigue: boolean;
  Danger: boolean;
  GnssFault: boolean;
  GnssAntennaDisconnect: boolean;
  GnssAntennaShort: boolean;
  PowerUnderVoltage: boolean;
  PowerDown: boolean;
  PowerDisplayFault: boolean;
  TtsFault: boolean;
  Rollover: boolean;
  Id: string;
  VehicleNo: string;
  VehicleId: string;
  OrgName: string;
  Address: string;
  GpsDate: string | number[] | number;
  ReceivedAt: string | number[] | number | null;
  GpsDateMillis: number | null;
  ReceivedAtMillis: number | null;
}

interface LiveTrackingBatchRow {
  vehicleId?: string;
  vehicleNumber?: string;
  raw?: {
    vehicleId?: string | number;
    VehicleId?: string | number;
    vehicleNo?: string;
    VehicleNo?: string;
  };
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "on";
  }
  return false;
}

function pick<T = unknown>(
  source: Record<string, any>,
  ...keys: string[]
): T | undefined {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key] as T;
    }
  }
  return undefined;
}

function normalizeVehicleData(raw: unknown): VehicleData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, any>;

  const latitude = toNumber(pick(obj, "Latitude", "latitude", "lat"));
  const longitude = toNumber(pick(obj, "Longitude", "longitude", "lng", "lon"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    DeviceNo: String(pick(obj, "DeviceNo", "deviceNo") ?? ""),
    Imei: String(pick(obj, "Imei", "imei") ?? ""),
    Latitude: latitude,
    Longitude: longitude,
    Speed: toNumber(pick(obj, "Speed", "speed")),
    Altitude: toNumber(pick(obj, "Altitude", "altitude")),
    Direction: toNumber(pick(obj, "Direction", "direction")),
    Rpm: pick(obj, "Rpm", "rpm") as number | null,
    Ignition: toBoolean(pick(obj, "Ignition", "ignition")),
    Ac: toBoolean(pick(obj, "Ac", "ac")),
    PowerCut: toBoolean(pick(obj, "PowerCut", "powerCut")),
    LowVoltage: toBoolean(pick(obj, "LowVoltage", "lowVoltage")),
    DoorLock: toBoolean(pick(obj, "DoorLock", "doorLock")),
    DoorOpen: toBoolean(pick(obj, "DoorOpen", "doorOpen")),
    DeviceLock: toBoolean(pick(obj, "DeviceLock", "deviceLock")),
    FuelCut: toBoolean(pick(obj, "FuelCut", "fuelCut")),
    GpsFixed: toBoolean(pick(obj, "GpsFixed", "gpsFixed")),
    Collision: toBoolean(pick(obj, "Collision", "collision")),
    GpsDate: (pick(obj, "GpsDate", "gpsDate") as string | number[]) ?? "",
    ReceivedAt:
      (pick(
        obj,
        "ReceivedAt",
        "receivedAt",
        "receivedAtMillis",
      ) as string | number[] | number | null) ??
      null,
    GpsDateMillis:
      (pick(obj, "GpsDateMillis", "gpsDateMillis") as number | null) ?? null,
    Sos: toBoolean(pick(obj, "Sos", "sos")),
    OverSpeed: toBoolean(pick(obj, "OverSpeed", "overSpeed")),
    Fatigue: toBoolean(pick(obj, "Fatigue", "fatigue")),
    Danger: toBoolean(pick(obj, "Danger", "danger")),
    GnssFault: toBoolean(pick(obj, "GnssFault", "gnssFault")),
    GnssAntennaDisconnect: toBoolean(
      pick(obj, "GnssAntennaDisconnect", "gnssAntennaDisconnect"),
    ),
    GnssAntennaShort: toBoolean(
      pick(obj, "GnssAntennaShort", "gnssAntennaShort"),
    ),
    PowerUnderVoltage: toBoolean(
      pick(obj, "PowerUnderVoltage", "powerUnderVoltage"),
    ),
    PowerDown: toBoolean(pick(obj, "PowerDown", "powerDown")),
    PowerDisplayFault: toBoolean(
      pick(obj, "PowerDisplayFault", "powerDisplayFault"),
    ),
    TtsFault: toBoolean(pick(obj, "TtsFault", "ttsFault")),
    Rollover: toBoolean(pick(obj, "Rollover", "rollover")),
    Id: String(pick(obj, "Id", "id") ?? ""),
    VehicleNo: String(pick(obj, "VehicleNo", "vehicleNo") ?? ""),
    VehicleId: String(pick(obj, "VehicleId", "vehicleId") ?? ""),
    OrgName: String(pick(obj, "OrgName", "orgName") ?? ""),
    Address: String(pick(obj, "Address", "address") ?? ""),
    ReceivedAtMillis:
      (pick(
        obj,
        "ReceivedAtMillis",
        "receivedAtMillis",
      ) as number | null) ?? null,
  };
}

export default function LiveTracking() {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();
  const params = useParams();
  const vehicleId = params?.id as string;
  const mapRef = useRef<google.maps.Map | null>(null);

  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [positionHistory, setPositionHistory] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [resolvedRedisId, setResolvedRedisId] = useState("");
  const { isLoaded, loadError, hasApiKey } = useGoogleMapsSdk();

  useEffect(() => {
    if (!vehicleId) return;

    let cancelled = false;
    setResolvedRedisId("");
    setError("");
    setLoading(true);

    const resolveRedisId = async () => {
      if (/^\d+$/.test(vehicleId)) {
        if (!cancelled) setResolvedRedisId(vehicleId);
        return;
      }

      try {
        const rows = await getLiveTrackingBatch();
        const normalizedRouteId = vehicleId.trim().toLowerCase();
        const matched = rows.find((row: LiveTrackingBatchRow) => {
          const raw = row?.raw || {};
          return (
            String(row?.vehicleNumber || "").trim().toLowerCase() ===
              normalizedRouteId ||
            String(raw?.vehicleNo || "").trim().toLowerCase() ===
              normalizedRouteId ||
            String(raw?.VehicleNo || "").trim().toLowerCase() ===
              normalizedRouteId
          );
        });

        const resolvedId =
          String(
            matched?.vehicleId ||
              matched?.raw?.vehicleId ||
              matched?.raw?.VehicleId,
          ).trim();

        if (!cancelled) {
          if (resolvedId && /^\d+$/.test(resolvedId)) {
            setResolvedRedisId(resolvedId);
            return;
          }

          setError("Vehicle ID not found for live tracking.");
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to resolve vehicle ID for live tracking.");
          setLoading(false);
        }
      }
    };

    void resolveRedisId();

    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  useEffect(() => {
    if (!resolvedRedisId) return;

    let cancelled = false;

    const fetchVehicleData = async () => {
      try {
        const proxyBase = process.env.NEXT_PUBLIC_API_BASE_URL;

        // 🔑 Get token from localStorage
        const token = localStorage.getItem("authToken");

        if (!token) {
          throw new Error("No authentication token found");
        }

        // 🔥 Include Authorization header
        const response = await fetch(
          `${proxyBase}api/redis/get?key=dashboard::${resolvedRedisId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch vehicle data");
        }

        const data = await response.json();

        // 🧩 Handle redis data format
        const rawPayload =
          typeof data?.value === "string"
            ? JSON.parse(data.value)
            : data?.data && typeof data.data === "object"
              ? data.data
              : data;

        const parsedValue = normalizeVehicleData(rawPayload);

        console.log("parsedValue", parsedValue);

        if (!parsedValue) {
          throw new Error("Invalid live tracking payload");
        }

        if (!cancelled) {
          setVehicleData(parsedValue);

          // 🗺️ Update position history
          if (
            Number.isFinite(parsedValue.Latitude) &&
            Number.isFinite(parsedValue.Longitude)
          ) {
            setPositionHistory((prev) => {
              const newHistory = [
                ...prev,
                {
                  lat: parsedValue.Latitude,
                  lng: parsedValue.Longitude,
                  timestamp:
                    parsedValue.ReceivedAtMillis ??
                    parsedValue.ReceivedAt ??
                    parsedValue.GpsDateMillis ??
                    parsedValue.GpsDate,
                },
              ];
              return newHistory.slice(-50);
            });
          }

          setError("");
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to fetch vehicle data",
          );
          setLoading(false);
        }
      }
    };

    fetchVehicleData();
    const interval = setInterval(fetchVehicleData, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [resolvedRedisId]);

  const lat = Number(vehicleData?.Latitude);
  const lng = Number(vehicleData?.Longitude);

  const mapCenter =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : { lat: 28.4595, lng: 77.0266 };

  const mapOptions = {
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    zoomControl: true,
    clickableIcons: false,
    styles: [
      {
        featureType: "all",
        elementType: "geometry",
        stylers: [{ color: "#e8f0e8" }],
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#c3e6f4" }],
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#ffffff" }],
      },
      {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#666666" }],
      },
    ],
  };

  const pathCoordinates = positionHistory.map((pos) => ({
    lat: pos.lat,
    lng: pos.lng,
  }));

  const formatDate = (
    dateStr: string | number[] | number | null | undefined,
  ) => {
    try {
      if (!dateStr) return "N/A";

      if (typeof dateStr === "number") {
        return new Date(dateStr).toLocaleString("en-US", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // Handle array format: [year, month, day, hours, minutes, seconds, milliseconds?]
      if (Array.isArray(dateStr)) {
        const [year, month, day, hours, minutes, seconds, nanos] = dateStr;
        const millis = Number.isFinite(Number(nanos))
          ? Math.floor(Number(nanos) / 1000000)
          : 0;
        const date = new Date(
          year,
          month - 1,
          day,
          hours,
          minutes,
          seconds,
          millis,
        );
        return date.toLocaleString("en-US", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // Handle string format (existing)
      return new Date(dateStr).toLocaleString("en-US", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  const getStatus = () => {
    if (!vehicleData) return "UNKNOWN";
    if (vehicleData.Speed > 5) return "MOVING";
    if (vehicleData.Ignition) return "IDLING";
    return "PARKED";
  };

  const infoTimestamp =
    vehicleData?.ReceivedAtMillis ??
    vehicleData?.ReceivedAt ??
    vehicleData?.GpsDateMillis ??
    vehicleData?.GpsDate;
  const hasHeading = Number(vehicleData?.Direction || 0) > 0;
  const hasAltitude = Number(vehicleData?.Altitude || 0) > 0;
  const visiblePositions = positionHistory
    .filter(
      (pos) =>
        Number.isFinite(pos.lat) &&
        Number.isFinite(pos.lng) &&
        !(pos.lat === 0 && pos.lng === 0),
    )
    .slice(-3)
    .reverse();
  const detailRows = [
    vehicleData?.VehicleId
      ? { label: "Vehicle ID", value: vehicleData.VehicleId }
      : null,
    vehicleData?.OrgName ? { label: "Org", value: vehicleData.OrgName } : null,
    vehicleData?.Address
      ? { label: "Address", value: vehicleData.Address }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];
  const accentColor = selectedColor || "#10b981";
  const accentSoftBg = `${accentColor}1A`;
  const accentMediumBg = `${accentColor}33`;

  if (!vehicleId) {
    return (
      <div className={`${isDark ? "dark" : ""}`}>
        <div
          className={`min-h-screen ${isDark ? "bg-background" : "bg-gray-50"} p-6`}
        >
          <div className="max-w-7xl mx-auto mb-6">
            <PageHeader
              title="Live Tracking"
              breadcrumbs={[
                { label: "Fleet" },
                { label: "Track & Trace", href: "/track-trace" },
                { label: "Vehicle" },
              ]}
              showButton
              buttonText="Back to Fleet"
              onButtonClick={() => router.push("/fleet")}
            />
          </div>
          <div className="max-w-7xl mx-auto flex items-center justify-center rounded-xl bg-red-50 p-8 text-lg font-semibold text-red-600">
            Vehicle ID not found
          </div>
        </div>
      </div>
  );
}

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div className={`min-h-screen ${isDark ? "bg-background" : "#fffff"} p-6`}>
        <div className="mx-auto mb-6">
          <PageHeader
            title="Live Tracking"
            breadcrumbs={[
              { label: "Fleet" },
              { label: "Track & Trace", href: "/fleet" },
              { label: loading ? "Vehicle" : vehicleData?.VehicleNo || vehicleId },
            ]}
            showButton
            buttonText="Back to Fleet"
            onButtonClick={() => router.push("/fleet")}
          />
        </div>
        <div className="mx-auto">
          <div
            className="relative w-full overflow-hidden rounded-xl sm:p-2 "
          >
            {/* Desktop Layout */}
            <div
              className="hidden h-full gap-3 lg:flex"
            >
        {/* Left Panel - Desktop */}
        <aside className="flex w-full max-w-sm flex-col overflow-y-auto rounded-lg bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 lg:w-[360px]">
          {/* Header */}
          <div className="border-b border-gray-700/50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <div
                    className="h-1.5 w-1.5 animate-pulse rounded-full shadow-lg"
                    style={{ backgroundColor: accentColor }}
                  ></div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: accentColor }}
                  >
                    Live Tracking
                  </span>
                </div>
                <h1 className="text-xl font-black text-white">
                  {loading ? "Loading..." : vehicleData?.VehicleNo || vehicleId}
                </h1>
              </div>
              <button
                className="rounded-lg p-1.5 transition"
                style={{ backgroundColor: accentSoftBg, color: accentColor }}
              >
                <Navigation className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Speed Display */}
          <div className="border-b border-gray-700/50 bg-gradient-to-br from-gray-800/50 to-transparent p-4">
            <div className="text-center">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Actual Speed
              </div>
              <div className="relative inline-flex items-baseline">
                <span
                  className="text-5xl font-black tabular-nums tracking-tight"
                  style={{ color: accentColor }}
                >
                  {loading ? "--" : Math.round(vehicleData?.Speed || 0)}
                </span>
                <span className="ml-2 text-base font-bold text-gray-500">
                  KM/H
                </span>
              </div>
              {/* Speed Bar */}
              <div className="mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(((vehicleData?.Speed || 0) / 120) * 100, 100)}%`,
                    backgroundColor: accentColor,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 border-b border-gray-700/50 p-4">
            <div className="rounded-lg bg-gray-800/50 p-3 backdrop-blur-sm">
              <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                <Navigation className="h-3 w-3" />
                Heading
              </div>
              <div className="text-lg font-black text-white">
                {loading ? "--" : `${vehicleData?.Direction || 0}°`}
              </div>
            </div>

            <div className="rounded-lg bg-gray-800/50 p-3 backdrop-blur-sm">
              <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                <Gauge className="h-3 w-3" />
                Altitude
              </div>
              <div className="text-lg font-black text-white">
                {loading ? "--" : `${vehicleData?.Altitude || 0}M`}
              </div>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="border-b border-gray-700/50 p-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Vehicle Status
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div
                className="flex items-center gap-2 rounded-lg p-2"
                style={{
                  backgroundColor: vehicleData?.Ignition
                    ? accentSoftBg
                    : "rgba(31, 41, 55, 0.5)",
                }}
              >
                <Zap
                  className="h-3.5 w-3.5"
                  style={{ color: vehicleData?.Ignition ? accentColor : "#6b7280" }}
                />
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                    Ignition
                  </div>
                  <div
                    className="text-xs font-black"
                    style={{ color: vehicleData?.Ignition ? accentColor : "#6b7280" }}
                  >
                    {vehicleData?.Ignition ? "ON" : "OFF"}
                  </div>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 rounded-lg p-2 ${vehicleData?.Ac ? "bg-blue-500/10" : "bg-gray-800/50"}`}
              >
                <Activity
                  className={`h-3.5 w-3.5 ${vehicleData?.Ac ? "text-blue-400" : "text-gray-500"}`}
                />
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                    AC
                  </div>
                  <div
                    className={`text-xs font-black ${vehicleData?.Ac ? "text-blue-400" : "text-gray-500"}`}
                  >
                    {vehicleData?.Ac ? "ON" : "OFF"}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Alerts */}
          {vehicleData &&
            (vehicleData.OverSpeed ||
              vehicleData.Sos ||
              vehicleData.Collision ||
              vehicleData.LowVoltage) && (
              <div className="border-b border-gray-700/50 p-4">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  Active Alerts
                </div>
                <div className="space-y-1.5">
                  {vehicleData.OverSpeed && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-400">
                      ⚠️ Over Speed Detected
                    </div>
                  )}
                  {vehicleData.Sos && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-400">
                      🆘 SOS Alert Active
                    </div>
                  )}
                  {vehicleData.Collision && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-400">
                      💥 Collision Detected
                    </div>
                  )}
                  {vehicleData.LowVoltage && (
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1.5 text-xs font-semibold text-yellow-400">
                      🔋 Low Battery Voltage
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Last Positions */}
          <div className="border-b border-gray-700/50 p-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Last Positions
            </div>
            <div className="space-y-1.5">
              {visiblePositions.map((pos, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-gray-800/30 px-3 py-2 text-xs backdrop-blur-sm"
                  >
                    <div className="font-mono text-gray-300">
                      {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                    </div>
                    <div
                      className="text-[10px] font-semibold"
                      style={{ color: idx === 0 ? accentColor : "#6b7280" }}
                    >
                      {idx === 0 ? "Now" : formatDate(pos.timestamp)}
                    </div>
                  </div>
                ))}
              {visiblePositions.length === 0 && !loading && (
                <div className="py-3 text-center text-xs text-gray-500">
                  No position data yet
                </div>
              )}
            </div>
          </div>

          {/* Device Info */}
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Device Info
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: accentColor }}
              >
                {getStatus()}
              </span>
            </div>
            <div className="rounded-lg bg-gray-800/50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: accentSoftBg }}
                >
                  <User className="h-4 w-4" style={{ color: accentColor }} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {loading ? "Loading..." : vehicleData?.DeviceNo || vehicleId}
                  </div>
                  {vehicleData?.Imei && (
                    <div className="text-[10px] text-gray-400">
                      IMEI: {vehicleData.Imei}
                    </div>
                  )}
                </div>
              </div>
              {detailRows.length > 0 && (
                <div className="mb-2 space-y-1 border-t border-gray-700/50 pt-2 text-[10px] text-gray-400">
                  {detailRows.map((row) => (
                    <div key={row.label}>
                      {row.label}: {row.value}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between border-t border-gray-700/50 pt-2">
                <div className="text-[10px] text-gray-400">
                  Last Update: {formatDate(infoTimestamp)}
                </div>
                <button
                  className="rounded-full p-1.5 transition"
                  style={{ backgroundColor: accentMediumBg, color: accentColor }}
                >
                  <Phone className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Map Section - Desktop */}
        <main className="relative flex-1 overflow-hidden rounded-lg">
          {!hasApiKey && (
            <div className="flex h-full items-center justify-center rounded-lg bg-white p-8 text-center text-sm font-semibold text-red-600">
              Google Maps key missing. Set `NEXT_PUBLIC_GOOGLE_MAPS_KEY`.
            </div>
          )}

          {hasApiKey && loadError && (
            <div className="flex h-full items-center justify-center rounded-lg bg-white p-8 text-center text-sm font-semibold text-red-600">
              Unable to load Google Maps SDK.
            </div>
          )}

          {hasApiKey && !loadError && !isLoaded && (
            <div className="flex h-full items-center justify-center rounded-lg bg-white p-8 text-sm font-semibold text-gray-500">
              Loading map...
            </div>
          )}

          {hasApiKey && !loadError && isLoaded && (
            <>
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={mapCenter}
                zoom={14}
                options={mapOptions}
                onLoad={(map) => {
                  mapRef.current = map;
                }}
              >
                {/* Vehicle Marker with Car Icon */}
                {vehicleData && (
                  <MarkerF
                    position={{
                      lat: vehicleData.Latitude,
                      lng: vehicleData.Longitude,
                    }}
                    icon={{
                      url: getCarMarkerSvg({
                        color: vehicleData.Ignition ? "#10b981" : "#94a3b8",
                        strokeColor: "#0f172a",
                        isActive: true,
                        direction: vehicleData.Direction,
                        size: 52,
                      }),
                      anchor: new google.maps.Point(26, 26),
                      scaledSize: new google.maps.Size(52, 52),
                    }}
                  />
                )}

                {/* Path Trail with Dotted Line */}
                {pathCoordinates.length > 1 && (
                  <PolylineF
                    path={pathCoordinates}
                    options={{
                      strokeColor: "#10b981",
                      strokeOpacity: 0,
                      strokeWeight: 0,
                      icons: [
                        {
                          icon: {
                            path: "M 0,-1 0,1",
                            strokeOpacity: 0.8,
                            strokeWeight: 4,
                            scale: 2,
                          },
                          offset: "0",
                          repeat: "12px",
                        },
                      ],
                      geodesic: true,
                    }}
                  />
                )}
              </GoogleMap>

              {/* Live Stream Badge */}
              <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1.5 shadow-xl">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Live Stream Active
                </span>
              </div>

              {/* Error Display */}
              {error && (
                <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-xl">
                  {error}
                </div>
              )}
            </>
          )}
            </main>
          </div>

          {/* Mobile Layout */}
          <div className="flex h-full flex-col lg:hidden">
        {/* Map Section - Mobile (Full Height) */}
        <div className="relative flex-1">
          {!hasApiKey && (
            <div className="flex h-full items-center justify-center bg-white p-4 text-center text-sm font-semibold text-red-600">
              Google Maps key missing. Set `NEXT_PUBLIC_GOOGLE_MAPS_KEY`.
            </div>
          )}

          {hasApiKey && loadError && (
            <div className="flex h-full items-center justify-center bg-white p-4 text-center text-sm font-semibold text-red-600">
              Unable to load Google Maps SDK.
            </div>
          )}

          {hasApiKey && !loadError && !isLoaded && (
            <div className="flex h-full items-center justify-center bg-white p-4 text-sm font-semibold text-gray-500">
              Loading map...
            </div>
          )}

          {hasApiKey && !loadError && isLoaded && (
            <>
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={mapCenter}
                zoom={14}
                options={mapOptions}
                onLoad={(map) => {
                  mapRef.current = map;
                }}
              >
                {/* Vehicle Marker */}
                {vehicleData && (
                  <MarkerF
                    position={{
                      lat: vehicleData.Latitude,
                      lng: vehicleData.Longitude,
                    }}
                    icon={{
                      url: getCarMarkerSvg({
                        color: vehicleData.Ignition ? "#10b981" : "#94a3b8",
                        strokeColor: "#0f172a",
                        isActive: true,
                        direction: vehicleData.Direction,
                        size: 52,
                      }),
                      anchor: new google.maps.Point(26, 26),
                      scaledSize: new google.maps.Size(52, 52),
                    }}
                  />
                )}

                {/* Path Trail */}
                {pathCoordinates.length > 1 && (
                  <PolylineF
                    path={pathCoordinates}
                    options={{
                      strokeColor: "#10b981",
                      strokeOpacity: 0,
                      strokeWeight: 0,
                      icons: [
                        {
                          icon: {
                            path: "M 0,-1 0,1",
                            strokeOpacity: 0.8,
                            strokeWeight: 4,
                            scale: 2,
                          },
                          offset: "0",
                          repeat: "12px",
                        },
                      ],
                      geodesic: true,
                    }}
                  />
                )}
              </GoogleMap>

              {/* Live Badge - Mobile */}
              <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1.5 shadow-xl">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Live
                </span>
              </div>

              {/* Quick Stats - Mobile Floating */}
              <div className="absolute left-4 right-4 top-20 rounded-lg bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {loading
                        ? "Loading..."
                        : vehicleData?.VehicleNo || vehicleId}
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-emerald-400">
                        {loading ? "--" : Math.round(vehicleData?.Speed || 0)}
                      </span>
                      <span className="text-xs font-bold text-gray-500">
                        KM/H
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div
                      className={`rounded-lg px-2 py-1 ${vehicleData?.Ignition ? "bg-emerald-500/20" : "bg-gray-700/50"}`}
                    >
                      <Zap
                        className={`h-4 w-4 ${vehicleData?.Ignition ? "text-emerald-400" : "text-gray-500"}`}
                      />
                    </div>
                    <div
                      className={`rounded-lg px-2 py-1 ${vehicleData?.GpsFixed ? "bg-emerald-500/20" : "bg-yellow-500/20"}`}
                    >
                      <Navigation
                        className={`h-4 w-4 ${vehicleData?.GpsFixed ? "text-emerald-400" : "text-yellow-400"}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Display - Mobile */}
              {error && (
                <div className="absolute left-4 right-4 top-40 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white shadow-xl">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Sheet - Mobile */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 transform rounded-t-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl transition-transform duration-300 ${
            isPanelExpanded ? "translate-y-0" : "translate-y-[calc(100%-120px)]"
          }`}
          style={{ maxHeight: "80vh" }}
        >
          {/* Handle */}
          <button
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            className="flex w-full items-center justify-center py-3"
          >
            <div className="h-1 w-12 rounded-full bg-gray-600"></div>
          </button>

          {/* Collapsed View */}
          <div
            className="cursor-pointer border-b border-gray-700/50 px-4 pb-4"
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Live Tracking
                  </span>
                </div>
                <h2 className="mt-1 text-lg font-black text-white">
                  {loading ? "Loading..." : vehicleData?.VehicleNo || vehicleId}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white">
                  {getStatus()}
                </span>
                {isPanelExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: "calc(80vh - 100px)" }}
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 border-b border-gray-700/50 p-4">
              <div className="rounded-lg bg-gray-800/50 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                  <Navigation className="h-3 w-3" />
                  Heading
                </div>
                <div className="text-lg font-black text-white">
                  {loading ? "--" : `${vehicleData?.Direction || 0}°`}
                </div>
              </div>

              <div className="rounded-lg bg-gray-800/50 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                  <Gauge className="h-3 w-3" />
                  Altitude
                </div>
                <div className="text-lg font-black text-white">
                  {loading ? "--" : `${vehicleData?.Altitude || 0}M`}
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="border-b border-gray-700/50 p-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Vehicle Status
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={`flex items-center gap-2 rounded-lg p-2 ${vehicleData?.Ignition ? "bg-emerald-500/10" : "bg-gray-800/50"}`}
                >
                  <Zap
                    className={`h-3.5 w-3.5 ${vehicleData?.Ignition ? "text-emerald-400" : "text-gray-500"}`}
                  />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Ignition
                    </div>
                    <div
                      className={`text-xs font-black ${vehicleData?.Ignition ? "text-emerald-400" : "text-gray-500"}`}
                    >
                      {vehicleData?.Ignition ? "ON" : "OFF"}
                    </div>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-2 rounded-lg p-2 ${vehicleData?.Ac ? "bg-blue-500/10" : "bg-gray-800/50"}`}
                >
                  <Activity
                    className={`h-3.5 w-3.5 ${vehicleData?.Ac ? "text-blue-400" : "text-gray-500"}`}
                  />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      AC
                    </div>
                    <div
                      className={`text-xs font-black ${vehicleData?.Ac ? "text-blue-400" : "text-gray-500"}`}
                    >
                      {vehicleData?.Ac ? "ON" : "OFF"}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Alerts */}
            {vehicleData &&
              (vehicleData.OverSpeed ||
                vehicleData.Sos ||
                vehicleData.Collision ||
                vehicleData.LowVoltage) && (
                <div className="border-b border-gray-700/50 p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    Active Alerts
                  </div>
                  <div className="space-y-1.5">
                    {vehicleData.OverSpeed && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-400">
                        ⚠️ Over Speed Detected
                      </div>
                    )}
                    {vehicleData.Sos && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-400">
                        🆘 SOS Alert Active
                      </div>
                    )}
                    {vehicleData.Collision && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-400">
                        💥 Collision Detected
                      </div>
                    )}
                    {vehicleData.LowVoltage && (
                      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1.5 text-xs font-semibold text-yellow-400">
                        🔋 Low Battery Voltage
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* Last Positions */}
            <div className="border-b border-gray-700/50 p-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Last Positions
              </div>
              <div className="space-y-1.5">
                {visiblePositions.map((pos, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-gray-800/30 px-3 py-2 text-xs"
                    >
                      <div className="font-mono text-gray-300">
                        {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                      </div>
                      <div
                        className={`text-[10px] font-semibold ${idx === 0 ? "text-emerald-400" : "text-gray-500"}`}
                      >
                        {idx === 0 ? "Now" : formatDate(pos.timestamp)}
                      </div>
                    </div>
                  ))}
                {visiblePositions.length === 0 && !loading && (
                  <div className="py-3 text-center text-xs text-gray-500">
                    No position data yet
                  </div>
                )}
              </div>
            </div>

            {/* Device Info */}
            <div className="p-4 pb-6">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Device Info
              </div>
              <div className="rounded-lg bg-gray-800/50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                    <User className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {loading ? "Loading..." : vehicleData?.DeviceNo || vehicleId}
                    </div>
                    {vehicleData?.Imei && (
                      <div className="text-[10px] text-gray-400">
                        IMEI: {vehicleData.Imei}
                      </div>
                    )}
                  </div>
                </div>
                {detailRows.length > 0 && (
                  <div className="mb-2 space-y-1 border-t border-gray-700/50 pt-2 text-[10px] text-gray-400">
                    {detailRows.map((row) => (
                      <div key={row.label}>
                        {row.label}: {row.value}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-gray-700/50 pt-2">
                  <div className="text-[10px] text-gray-400">
                    Last Update: {formatDate(infoTimestamp)}
                  </div>
                  <button className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-400 transition hover:bg-emerald-500/20">
                    <Phone className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}
