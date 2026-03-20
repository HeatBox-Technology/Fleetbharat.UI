"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, MarkerF, PolylineF } from "@react-google-maps/api";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Layers3,
  Pause,
  Play,
  Settings,
  Gauge,
  Navigation,
  Zap,
  AlertTriangle,
  MapPin,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { useGoogleMapsSdk } from "@/hooks/useGoogleMapsSdk";
import { useParams, useRouter } from "next/navigation";
import { getCarMarkerSvg } from "@/utils/carMarkerIcon";

const API_BASE_URL = process.env.NEXT_PUBLIC_JAVA_API_BASE_URL;

interface HistoryDataPoint {
  deviceNo: string;
  imei: string;
  latitude: number;
  longitude: number;
  speed: number;
  altitude: number;
  direction: number;
  rpm: string | null;
  northSouthLatitude: string | null;
  eastWestLongitude: string | null;
  ignition: boolean;
  ac: boolean;
  powerCut: boolean;
  lowVoltage: boolean;
  doorLock: boolean;
  doorOpen: boolean;
  deviceLock: boolean;
  fuelCut: boolean;
  gpsFixed: boolean;
  collision: boolean;
  gpsDate: string;
  sos: boolean;
  overSpeed: boolean;
  fatigue: boolean;
  danger: boolean;
  gnssFault: boolean;
  gnssAntennaDisconnect: boolean;
  gnssAntennaShort: boolean;
  powerUnderVoltage: boolean;
  powerDown: boolean;
  powerDisplayFault: boolean;
  ttsFault: boolean;
  rollover: boolean;
  receivedAt: string | null;
  id: string;
  vehicleNo: string;
}

interface ViolationPoint extends HistoryDataPoint {
  index: number;
}

// Keep API datetime in local-style format without UTC suffix (e.g. 2026-02-12T13:00:00)
function formatDateForAPI(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.length === 16) return `${trimmed}:00`;
  return trimmed.replace(/\.\d{3}Z$/, "").replace(/Z$/, "");
}

function formatDateTimeLocalInput(date: Date): string {
  const pad = (num: number): string => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Helper to format date display
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calculateDistance(points: HistoryDataPoint[]): string {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const lat1 = points[i - 1].latitude;
    const lon1 = points[i - 1].longitude;
    const lat2 = points[i].latitude;
    const lon2 = points[i].longitude;

    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  return total.toFixed(1);
}

function calculateMovingTime(points: HistoryDataPoint[]): string {
  if (points.length < 2) return "0h 0m";

  const start = new Date(points[0].gpsDate);
  const end = new Date(points[points.length - 1].gpsDate);
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}

function getAnchoredIcon(url: string, size: number): google.maps.Icon {
  const maps = typeof window !== "undefined" ? window.google?.maps : undefined;
  if (!maps) return { url };

  return {
    url,
    scaledSize: new maps.Size(size, size),
    anchor: new maps.Point(size / 2, size / 2),
  };
}

function getPathBearing(from: HistoryDataPoint, to: HistoryDataPoint): number {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export default function HistoryTracking() {
  const params = useParams();
  const router = useRouter();
  const mapRef = useRef<google.maps.Map | null>(null);

  const vehicleId = params?.id as string;

  // Date state - default to today
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return formatDateTimeLocalInput(date);
  });

  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return formatDateTimeLocalInput(date);
  });

  // Data state
  const [historyData, setHistoryData] = useState<HistoryDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [animatedPosition, setAnimatedPosition] =
    useState<google.maps.LatLngLiteral | null>(null);

  // Mobile UI state
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousIndexRef = useRef<number>(0);

  const { isLoaded, loadError, hasApiKey } = useGoogleMapsSdk();

  // Fetch history data
  const fetchHistoryData = async (): Promise<void> => {
    if (!vehicleId) {
      setError("Vehicle ID not provided");
      return;
    }

    setIsLoading(true);
    setError("");
    setShowDatePicker(false);
    try {
      const response = await fetch(`${API_BASE_URL}history/history-tracking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId: vehicleId,
          start: formatDateForAPI(startDate),
          end: formatDateForAPI(endDate),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: HistoryDataPoint[] = await response.json();

      if (!data || data.length === 0) {
        setError("No tracking data found for this time period");
        setHistoryData([]);
        setCurrentIndex(0);
        setAnimatedPosition(null);
        previousIndexRef.current = 0;
        setIsPlaying(false);
        return;
      }

      setHistoryData(data);
      setCurrentIndex(0);
      setAnimatedPosition({ lat: data[0].latitude, lng: data[0].longitude });
      previousIndexRef.current = 0;

      // Fit bounds to show entire route
      if (mapRef.current && data.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        data.forEach((point) => {
          bounds.extend({ lat: point.latitude, lng: point.longitude });
        });
        mapRef.current.fitBounds(bounds);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch history data";
      setError(errorMessage);
      setHistoryData([]);
      setCurrentIndex(0);
      setAnimatedPosition(null);
      previousIndexRef.current = 0;
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Playback controls
  useEffect(() => {
    if (isPlaying && historyData.length > 0) {
      const interval = 1000 / playbackSpeed; // Adjust speed

      playbackIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= historyData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);

      return () => {
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
        }
      };
    }
  }, [isPlaying, historyData.length, playbackSpeed]);

  useEffect(() => {
    if (!historyData.length) {
      setAnimatedPosition(null);
      previousIndexRef.current = 0;
      return;
    }

    const safeIndex = Math.min(currentIndex, historyData.length - 1);
    const targetPoint = historyData[safeIndex];
    const targetPosition = {
      lat: targetPoint.latitude,
      lng: targetPoint.longitude,
    };

    const previousIndex = Math.min(
      previousIndexRef.current,
      historyData.length - 1,
    );

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const indexStep = Math.abs(safeIndex - previousIndex);
    if (indexStep > 1) {
      setAnimatedPosition(targetPosition);
      previousIndexRef.current = safeIndex;
      return;
    }

    if (indexStep === 0) {
      setAnimatedPosition(targetPosition);
      previousIndexRef.current = safeIndex;
      return;
    }

    const startIndex =
      safeIndex > previousIndex ? Math.max(safeIndex - 1, 0) : safeIndex + 1;
    const startPoint =
      historyData[Math.min(startIndex, historyData.length - 1)];
    const startPosition = {
      lat: startPoint.latitude,
      lng: startPoint.longitude,
    };

    const durationMs =
      isPlaying && indexStep === 1 ? Math.max(120, 1000 / playbackSpeed) : 220;
    const animationStart = performance.now();

    const animate = (timestamp: number) => {
      const progress = Math.min((timestamp - animationStart) / durationMs, 1);

      setAnimatedPosition({
        lat:
          startPosition.lat +
          (targetPosition.lat - startPosition.lat) * progress,
        lng:
          startPosition.lng +
          (targetPosition.lng - startPosition.lng) * progress,
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      animationFrameRef.current = null;
      previousIndexRef.current = safeIndex;
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [currentIndex, historyData, isPlaying, playbackSpeed]);

  // Current position data
  const currentPoint: HistoryDataPoint | undefined = historyData[currentIndex];
  const routePath = useMemo<google.maps.LatLngLiteral[]>(
    () =>
      historyData
        .slice(0, currentIndex + 1)
        .map((point) => ({ lat: point.latitude, lng: point.longitude })),
    [historyData, currentIndex],
  );

  const mapCenter = useMemo<google.maps.LatLngLiteral>(() => {
    if (animatedPosition) {
      return animatedPosition;
    }
    if (currentPoint) {
      return { lat: currentPoint.latitude, lng: currentPoint.longitude };
    }
    return { lat: 28.4595, lng: 77.0266 };
  }, [animatedPosition, currentPoint]);

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      zoomControl: true,
      clickableIcons: false,
    }),
    [],
  );

  // Violations in current data
  const violations = useMemo<ViolationPoint[]>(() => {
    if (!historyData.length) return [];

    return historyData
      .map((point, idx) => ({
        ...point,
        index: idx,
      }))
      .filter((point) => point.overSpeed || point.collision || point.fatigue);
  }, [historyData]);

  // Stats
  const stats = useMemo(() => {
    if (!historyData.length) {
      return {
        distance: "0",
        movingTime: "0h 0m",
        violations: 0,
      };
    }

    return {
      distance: calculateDistance(historyData),
      movingTime: calculateMovingTime(historyData),
      violations: violations.length,
    };
  }, [historyData, violations]);

  const carDirection = useMemo<number>(() => {
    if (!historyData.length) return 0;
    if (historyData.length === 1) return historyData[0].direction || 0;

    const safeIndex = Math.min(currentIndex, historyData.length - 1);
    const fromIndex = safeIndex === 0 ? 0 : safeIndex - 1;
    const toIndex = safeIndex === 0 ? 1 : safeIndex;
    const fromPoint = historyData[fromIndex];
    const toPoint = historyData[toIndex];

    const samePoint =
      fromPoint.latitude === toPoint.latitude &&
      fromPoint.longitude === toPoint.longitude;
    if (samePoint) return historyData[safeIndex].direction || 0;

    return getPathBearing(fromPoint, toPoint);
  }, [historyData, currentIndex]);

  return (
    <div className="relative min-h-screen bg-[#f3f4f6]">
      {/* Desktop Layout */}
      <div className="hidden p-3 md:p-4 lg:block">
        {/* Header */}
        <header className="mb-4">
          <button
            onClick={() => router.push("/fleet")}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            BACK TO FLEET
          </button>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="mb-1 text-[14px] font-bold uppercase tracking-widest text-purple-600">
                HISTORY ANALYSIS
              </h1>
              <div className="text-3xl font-black text-slate-900">
                {vehicleId || "Unknown Vehicle"}
              </div>
            </div>
          </div>
        </header>

        {/* Time Period Settings */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-[12px] font-bold uppercase tracking-widest text-slate-600">
            TIME PERIOD SETTINGS
          </h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                End Date
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchHistoryData}
                disabled={isLoading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                <Navigation className="h-4 w-4" />
                {isLoading ? "Loading..." : "RE-PLOT ROUTE"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[340px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-3">
            {/* Movement Stats */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-[12px] font-bold uppercase tracking-widest text-slate-600">
                MOVEMENT STATS (TODAY)
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Dist. Covered
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {stats.distance} KM
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Moving Time
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {stats.movingTime}
                  </div>
                </div>
              </div>
            </div>

            {/* Violations */}
            {violations.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-[12px] font-bold uppercase tracking-widest text-slate-600">
                  VIOLATIONS RECORDED
                </h3>

                <div className="space-y-2">
                  {violations.map((violation, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentIndex(violation.index);
                        setIsPlaying(false);
                      }}
                      className="w-full rounded-xl border border-red-200 bg-red-50 p-3 text-left transition hover:bg-red-100"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-bold text-red-600">
                          {violation.overSpeed && "Over-speeding"}
                          {violation.collision && "Collision"}
                          {violation.fatigue && "Fatigue"}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        {formatTime(violation.gpsDate)} • {violation.speed} KM/H
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Current Position Info */}
            {currentPoint && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-[12px] font-bold uppercase tracking-widest text-slate-600">
                  CURRENT POSITION
                </h3>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <Gauge className="h-3.5 w-3.5" />
                        Speed
                      </div>
                      <div className="text-lg font-black text-slate-900">
                        {currentPoint.speed} KM/H
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <Zap className="h-3.5 w-3.5" />
                        Ignition
                      </div>
                      <div
                        className={`text-lg font-black ${
                          currentPoint.ignition
                            ? "text-emerald-500"
                            : "text-slate-400"
                        }`}
                      >
                        {currentPoint.ignition ? "ON" : "OFF"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      Timestamp
                    </div>
                    <div className="text-sm font-bold text-slate-700">
                      {formatDateTime(currentPoint.gpsDate)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Map */}
          <main className="relative min-h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {!hasApiKey && (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm font-semibold text-red-600">
                Google Maps key missing in env. Set
                `NEXT_PUBLIC_GOOGLE_MAPS_KEY`.
              </div>
            )}

            {hasApiKey && loadError && (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm font-semibold text-red-600">
                Unable to load Google Maps SDK.
              </div>
            )}

            {hasApiKey && !loadError && !isLoaded && (
              <div className="flex h-full items-center justify-center p-8 text-sm font-semibold text-slate-500">
                Loading map...
              </div>
            )}

            {hasApiKey && !loadError && isLoaded && (
              <>
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  center={mapCenter}
                  zoom={13}
                  options={mapOptions}
                  onLoad={(map) => {
                    mapRef.current = map;
                  }}
                >
                  {/* Route polyline */}
                  {routePath.length > 1 && (
                    <PolylineF
                      path={routePath}
                      options={{
                        strokeColor: "#6366f1",
                        strokeOpacity: 0.9,
                        strokeWeight: 4,
                      }}
                    />
                  )}

                  {/* Start marker */}
                  {historyData.length > 0 && (
                    <MarkerF
                      position={{
                        lat: historyData[0].latitude,
                        lng: historyData[0].longitude,
                      }}
                      icon={{
                        ...getAnchoredIcon(
                          getCarMarkerSvg({
                            color: "#10b981",
                            strokeColor: "#0f172a",
                            size: 44,
                          }),
                          44,
                        ),
                      }}
                    />
                  )}

                  {/* End marker */}
                  {historyData.length > 0 &&
                    currentIndex === historyData.length - 1 && (
                      <MarkerF
                        position={{
                          lat: historyData[historyData.length - 1].latitude,
                          lng: historyData[historyData.length - 1].longitude,
                        }}
                        icon={{
                          ...getAnchoredIcon(
                            getCarMarkerSvg({
                              color: "#ef4444",
                              strokeColor: "#0f172a",
                              size: 44,
                            }),
                            44,
                          ),
                        }}
                      />
                    )}

                  {/* Current position marker */}
                  {currentPoint && animatedPosition && (
                    <MarkerF
                      position={animatedPosition}
                      icon={{
                        ...getAnchoredIcon(
                          getCarMarkerSvg({
                            color: "#1d4ed8",
                            strokeColor: "#0f172a",
                            isActive: true,
                            size: 48,
                            direction: carDirection,
                          }),
                          48,
                        ),
                      }}
                    />
                  )}

                  {/* Violation markers */}
                  {violations.map((violation, idx) => (
                    <MarkerF
                      key={idx}
                      position={{
                        lat: violation.latitude,
                        lng: violation.longitude,
                      }}
                      icon={{
                        ...getAnchoredIcon(
                          "data:image/svg+xml;utf-8," +
                            encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
                          <circle cx="14" cy="14" r="10" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
                          <text x="14" y="18" text-anchor="middle" font-size="14" font-weight="bold" fill="white">!</text>
                        </svg>
                      `),
                          28,
                        ),
                      }}
                      onClick={() => {
                        setCurrentIndex(violation.index);
                        setIsPlaying(false);
                      }}
                    />
                  ))}
                </GoogleMap>

                {/* Playback Controls */}
                {historyData.length > 0 && (
                  <div className="absolute bottom-6 left-1/2 w-[90%] max-w-4xl -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-indigo-600">
                          {formatTime(historyData[0].gpsDate)}
                        </span>
                        <span className="text-xs font-semibold uppercase text-slate-400">
                          PLAYING TRIP • {playbackSpeed}X
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        {formatTime(
                          historyData[historyData.length - 1].gpsDate,
                        )}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="relative mb-3 h-2 rounded-full bg-slate-200">
                      <div
                        className="absolute h-full rounded-full bg-indigo-600 transition-all"
                        style={{
                          width: `${(currentIndex / (historyData.length - 1)) * 100}%`,
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max={historyData.length - 1}
                        value={currentIndex}
                        onChange={(e) => {
                          setCurrentIndex(Number(e.target.value));
                          setIsPlaying(false);
                        }}
                        className="absolute inset-0 w-full cursor-pointer opacity-0"
                      />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-700"
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5" fill="currentColor" />
                        ) : (
                          <Play className="h-5 w-5" fill="currentColor" />
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        {[1, 2, 4].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`h-8 rounded-lg px-3 text-xs font-bold transition ${
                              playbackSpeed === speed
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Map controls */}
                <div className="absolute right-4 top-4 flex flex-col gap-2">
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#6d28d9] text-white shadow-lg"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg"
                  >
                    <Layers3 className="h-5 w-5" />
                  </button>
                </div>

                {/* Error/Empty states */}
                {error && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-red-200 bg-white p-6 text-center shadow-xl">
                    <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                    <div className="text-sm font-semibold text-red-600">
                      {error}
                    </div>
                  </div>
                )}

                {!isLoading && !error && historyData.length === 0 && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
                    <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                    <div className="text-sm font-semibold text-slate-600">
                      Select a time period and click "RE-PLOT ROUTE"
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="flex h-screen flex-col lg:hidden">
        {/* Mobile Header */}
        <header className="bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/fleet")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Fleet</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDatePicker(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Date</span>
              </button>

              <button
                onClick={() => setShowSidebar(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              >
                <Gauge className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Stats</span>
              </button>
            </div>
          </div>

          <div className="mt-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
              History Analysis
            </div>
            <div className="text-lg font-black text-slate-900">
              {vehicleId || "Unknown Vehicle"}
            </div>
          </div>
        </header>

        {/* Mobile Map */}
        <main className="relative flex-1">
          {!hasApiKey && (
            <div className="flex h-full items-center justify-center bg-white p-4 text-center text-sm font-semibold text-red-600">
              Google Maps key missing
            </div>
          )}

          {hasApiKey && loadError && (
            <div className="flex h-full items-center justify-center bg-white p-4 text-center text-sm font-semibold text-red-600">
              Unable to load Maps
            </div>
          )}

          {hasApiKey && !loadError && !isLoaded && (
            <div className="flex h-full items-center justify-center bg-white p-4 text-sm font-semibold text-slate-500">
              Loading map...
            </div>
          )}

          {hasApiKey && !loadError && isLoaded && (
            <>
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={mapCenter}
                zoom={13}
                options={mapOptions}
                onLoad={(map) => {
                  mapRef.current = map;
                }}
              >
                {/* Route polyline */}
                {routePath.length > 1 && (
                  <PolylineF
                    path={routePath}
                    options={{
                      strokeColor: "#6366f1",
                      strokeOpacity: 0.9,
                      strokeWeight: 4,
                    }}
                  />
                )}

                {/* Start marker */}
                {historyData.length > 0 && (
                  <MarkerF
                    position={{
                      lat: historyData[0].latitude,
                      lng: historyData[0].longitude,
                    }}
                    icon={{
                      ...getAnchoredIcon(
                        getCarMarkerSvg({
                          color: "#10b981",
                          strokeColor: "#0f172a",
                          size: 44,
                        }),
                        44,
                      ),
                    }}
                  />
                )}

                {/* End marker */}
                {historyData.length > 0 &&
                  currentIndex === historyData.length - 1 && (
                    <MarkerF
                      position={{
                        lat: historyData[historyData.length - 1].latitude,
                        lng: historyData[historyData.length - 1].longitude,
                      }}
                      icon={{
                        ...getAnchoredIcon(
                          getCarMarkerSvg({
                            color: "#ef4444",
                            strokeColor: "#0f172a",
                            size: 44,
                          }),
                          44,
                        ),
                      }}
                    />
                  )}

                {/* Current position marker */}
                {currentPoint && animatedPosition && (
                  <MarkerF
                    position={animatedPosition}
                    icon={{
                      ...getAnchoredIcon(
                        getCarMarkerSvg({
                          color: "#1d4ed8",
                          strokeColor: "#0f172a",
                          isActive: true,
                          size: 48,
                          direction: carDirection,
                        }),
                        48,
                      ),
                    }}
                  />
                )}

                {/* Violation markers */}
                {violations.map((violation, idx) => (
                  <MarkerF
                    key={idx}
                    position={{
                      lat: violation.latitude,
                      lng: violation.longitude,
                    }}
                    icon={{
                      ...getAnchoredIcon(
                        "data:image/svg+xml;utf-8," +
                          encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
                          <circle cx="14" cy="14" r="10" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
                          <text x="14" y="18" text-anchor="middle" font-size="14" font-weight="bold" fill="white">!</text>
                        </svg>
                      `),
                        28,
                      ),
                    }}
                    onClick={() => {
                      setCurrentIndex(violation.index);
                      setIsPlaying(false);
                    }}
                  />
                ))}
              </GoogleMap>

              {/* Mobile Stats Card - Floating */}
              {currentPoint && (
                <div className="absolute left-4 right-4 top-4 rounded-xl bg-white/95 p-3 shadow-lg backdrop-blur">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        Speed
                      </div>
                      <div className="text-xl font-black text-slate-900">
                        {currentPoint.speed}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400">
                        KM/H
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        Distance
                      </div>
                      <div className="text-xl font-black text-slate-900">
                        {stats.distance}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400">
                        KM
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        Time
                      </div>
                      <div className="text-xl font-black text-slate-900">
                        {stats.movingTime.split(" ")[0]}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400">
                        {stats.movingTime.split(" ")[1]}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Playback Controls */}
              {historyData.length > 0 && (
                <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white/95 p-3 shadow-lg backdrop-blur">
                  {/* Progress bar */}
                  <div className="relative mb-3 h-2 rounded-full bg-slate-200">
                    <div
                      className="absolute h-full rounded-full bg-indigo-600 transition-all"
                      style={{
                        width: `${(currentIndex / (historyData.length - 1)) * 100}%`,
                      }}
                    />
                    <input
                      type="range"
                      min="0"
                      max={historyData.length - 1}
                      value={currentIndex}
                      onChange={(e) => {
                        setCurrentIndex(Number(e.target.value));
                        setIsPlaying(false);
                      }}
                      className="absolute inset-0 w-full cursor-pointer opacity-0"
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" fill="currentColor" />
                      ) : (
                        <Play className="h-5 w-5" fill="currentColor" />
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      {[1, 2, 4].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => setPlaybackSpeed(speed)}
                          className={`h-8 rounded-lg px-2.5 text-xs font-bold ${
                            playbackSpeed === speed
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>

                    <div className="text-xs font-semibold text-slate-500">
                      {formatTime(currentPoint?.gpsDate || "")}
                    </div>
                  </div>
                </div>
              )}

              {/* Error states */}
              {error && (
                <div className="absolute left-4 right-4 top-20 rounded-xl bg-red-500 p-3 text-center text-sm font-semibold text-white shadow-lg">
                  {error}
                </div>
              )}
            </>
          )}
        </main>

        {/* Mobile Date Picker Modal */}
        {showDatePicker && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/50">
            <div className="w-full rounded-t-3xl bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">
                  Select Time Period
                </h3>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="rounded-full p-1 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </div>

                <button
                  onClick={fetchHistoryData}
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Navigation className="h-4 w-4" />
                  {isLoading ? "Loading..." : "RE-PLOT ROUTE"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Sidebar Modal */}
        {showSidebar && (
          <div className="fixed inset-0 z-50 flex bg-black/50">
            <div className="ml-auto h-full w-[85%] max-w-sm overflow-y-auto bg-white">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
                <h3 className="text-lg font-black text-slate-900">
                  Trip Details
                </h3>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="rounded-full p-1 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-4">
                {/* Movement Stats */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                    Movement Stats
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        Distance
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {stats.distance}
                      </div>
                      <div className="text-xs text-slate-500">KM</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        Time
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {stats.movingTime}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Violations */}
                {violations.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                      Violations ({violations.length})
                    </h4>
                    <div className="space-y-2">
                      {violations.map((violation, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setCurrentIndex(violation.index);
                            setIsPlaying(false);
                            setShowSidebar(false);
                          }}
                          className="w-full rounded-lg border border-red-200 bg-red-50 p-3 text-left"
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-bold text-red-600">
                              {violation.overSpeed && "Over-speeding"}
                              {violation.collision && "Collision"}
                              {violation.fatigue && "Fatigue"}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatTime(violation.gpsDate)} • {violation.speed}{" "}
                            KM/H
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Position */}
                {currentPoint && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                      Current Position
                    </h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500">
                            <Gauge className="h-3 w-3" />
                            Speed
                          </div>
                          <div className="text-lg font-black text-slate-900">
                            {currentPoint.speed} KM/H
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500">
                            <Zap className="h-3 w-3" />
                            Ignition
                          </div>
                          <div
                            className={`text-lg font-black ${
                              currentPoint.ignition
                                ? "text-emerald-500"
                                : "text-slate-400"
                            }`}
                          >
                            {currentPoint.ignition ? "ON" : "OFF"}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500">
                          <Clock className="h-3 w-3" />
                          Timestamp
                        </div>
                        <div className="text-sm font-bold text-slate-700">
                          {formatDateTime(currentPoint.gpsDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
