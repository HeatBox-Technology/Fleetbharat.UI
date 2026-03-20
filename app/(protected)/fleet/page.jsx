"use client";

import { GoogleMap, MarkerF, PolylineF } from "@react-google-maps/api";
import {
  Activity,
  CarFront,
  CircleDotDashed,
  CircleX,
  Clock3,
  Filter,
  Gauge,
  Layers3,
  LocateFixed,
  Navigation,
  Search,
  Settings2,
  User,
  WifiOff,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import { useGoogleMapsSdk } from "@/hooks/useGoogleMapsSdk";
import {
  getLiveTrackingBatch,
} from "@/services/liveTrackingService";
import { getCarMarkerSvg } from "@/utils/carMarkerIcon";

const POLL_MS = 15000;
const SEARCH_DEBOUNCE_MS = 350;
const BATCH_FETCH_THROTTLE_MS = 4000;

const STATUS_META = {
  ALL: { color: "#4f46e5", icon: CarFront },
  MOVING: { color: "#0ea5a4", icon: Navigation },
  IDLING: { color: "#6366f1", icon: Activity },
  PARKED: { color: "#10b981", icon: LocateFixed },
  OFFLINE: { color: "#94a3b8", icon: WifiOff },
  BREAKDOWN: { color: "#ef4444", icon: Wrench },
  EXPIRED: { color: "#8b5cf6", icon: CircleX },
};

export default function FleetDashboard() {
  const mapRef = useRef(null);
  const router = useRouter();
  const { isDark } = useTheme();
  const [fleetData, setFleetData] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [popupVehicleId, setPopupVehicleId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isFleetLoading, setIsFleetLoading] = useState(true);
  const [fleetError, setFleetError] = useState("");
  const [vehicleTrails, setVehicleTrails] = useState({});
  const { isLoaded, loadError, hasApiKey } = useGoogleMapsSdk();
  const lastBatchFetchAtRef = useRef(0);
  const isBatchFetchInProgressRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadFleet = useCallback(async (cancelledRef, force = false) => {
    const now = Date.now();
    const shouldSkip =
      !force &&
      (isBatchFetchInProgressRef.current ||
        now - lastBatchFetchAtRef.current < BATCH_FETCH_THROTTLE_MS);
    if (shouldSkip) return;

    isBatchFetchInProgressRef.current = true;
    try {
      setFleetError("");
      const vehicles = await getLiveTrackingBatch();

      if (!vehicles.length) {
        throw new Error("No live vehicle data received");
      }

      if (!cancelledRef.current) {
        setFleetData(vehicles);
        setSelectedVehicleId((prev) => {
          if (prev && vehicles.some((v) => v.id === prev)) return prev;
          return null;
        });
        setPopupVehicleId((prev) => {
          if (prev && vehicles.some((v) => v.id === prev)) return prev;
          return null;
        });
        setVehicleTrails((prev) => {
          const next = { ...prev };
          vehicles.forEach((vehicle) => {
            const point = {
              lat: vehicle.position[0],
              lng: vehicle.position[1],
            };
            const trail = next[vehicle.id] ? [...next[vehicle.id]] : [];
            const last = trail[trail.length - 1];
            if (!last || last.lat !== point.lat || last.lng !== point.lng) {
              trail.push(point);
            }
            next[vehicle.id] = trail.slice(-40);
          });
          return next;
        });
      }
    } catch (error) {
      if (!cancelledRef.current) {
        setFleetError(error?.message || "Unable to fetch live tracking data");
      }
    } finally {
      lastBatchFetchAtRef.current = Date.now();
      isBatchFetchInProgressRef.current = false;
      if (!cancelledRef.current) setIsFleetLoading(false);
    }
  }, []);

  useEffect(() => {
    const cancelledRef = { current: false };

    loadFleet(cancelledRef, true);
    const timer = setInterval(() => loadFleet(cancelledRef), POLL_MS);

    return () => {
      cancelledRef.current = true;
      clearInterval(timer);
    };
  }, [loadFleet]);

  const statusCounts = useMemo(
    () =>
      fleetData.reduce((acc, vehicle) => {
        acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
        return acc;
      }, {}),
    [fleetData],
  );

  const stats = useMemo(
    () => [
      { label: "ALL", count: fleetData.length },
      { label: "MOVING", count: statusCounts.MOVING || 0 },
      { label: "IDLING", count: statusCounts.IDLING || 0 },
      { label: "PARKED", count: statusCounts.PARKED || 0 },
      { label: "OFFLINE", count: statusCounts.OFFLINE || 0 },
      { label: "BREAKDOWN", count: statusCounts.BREAKDOWN || 0 },
      { label: "EXPIRED", count: statusCounts.EXPIRED || 0 },
    ],
    [fleetData.length, statusCounts],
  );

  const filteredFleet = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();
    return fleetData.filter((vehicle) => {
      const byStatus =
        filterStatus === "ALL" || vehicle.status === filterStatus;
      const bySearch =
        !term ||
        vehicle.name?.toLowerCase().includes(term) ||
        vehicle.vehicleNumber?.toLowerCase().includes(term);
      return byStatus && bySearch;
    });
  }, [fleetData, filterStatus, debouncedSearchTerm]);

  const selectedVehicle =
    fleetData.find((vehicle) => vehicle.id === selectedVehicleId) || null;

  const popupVehicle =
    fleetData.find((vehicle) => vehicle.id === popupVehicleId) || null;

  const mapCenter = useMemo(
    () =>
      selectedVehicle
        ? { lat: selectedVehicle.position[0], lng: selectedVehicle.position[1] }
        : fleetData[0]
          ? { lat: fleetData[0].position[0], lng: fleetData[0].position[1] }
          : { lat: 28.4595, lng: 77.0266 },
    [selectedVehicle, fleetData],
  );

  const mapOptions = useMemo(
    () => ({
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      zoomControl: true,
      clickableIcons: false,
    }),
    [],
  );

  const focusVehicle = (vehicle, openPopup = true) => {
    setSelectedVehicleId(vehicle.id);
    if (openPopup) setPopupVehicleId(vehicle.id);
    if (mapRef.current) {
      mapRef.current.panTo({
        lat: vehicle.position[0],
        lng: vehicle.position[1],
      });
      mapRef.current.setZoom(13);
    }
  };

  return (
    <div className={`${isDark ? "dark" : ""}`}>
      <div
        className={`min-h-screen ${isDark ? "bg-background" : "bg-[#f3f4f6]"} p-3 md:p-4`}
      >
        <div className="mx-auto mb-4 max-w-7xl">
          <PageHeader
            title="Fleet Intelligence"
            subtitle="Track, monitor, and manage your fleet in real time."
            breadcrumbs={[
              { label: "Operations" },
              { label: "Live Fleet Hub" },
            ]}
            showButton={false}
            showExportButton={false}
            showFilterButton={false}
            showBulkUpload={false}
          />
        </div>

        <div className="mx-auto max-w-7xl">
          <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <div className="flex items-center gap-2">
              <div className="relative w-full max-w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  type="text"
                  placeholder="Search plate or ID..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                <Filter className="h-4 w-4" />
                Filter
              </button>
            </div>
          </header>

          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
            {stats.map((stat) => {
              const active = filterStatus === stat.label;
              const Icon = STATUS_META[stat.label]?.icon || CircleDotDashed;
              return (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => setFilterStatus(stat.label)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-indigo-200 bg-white shadow-sm"
                      : "border-transparent bg-[#ededf0] hover:bg-[#e8e9ed]"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <span className="text-[12px] font-bold tracking-widest text-slate-600">
                      {stat.label}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-800">
                    {stat.count}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid min-h-[68vh] grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl bg-transparent">
          <div className="max-h-[68vh] space-y-3 overflow-y-auto pr-1">
            {isFleetLoading && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
                Loading vehicle data...
              </div>
            )}
            {!isFleetLoading && fleetError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-600">
                {fleetError}
              </div>
            )}
            {!isFleetLoading &&
              !fleetError &&
              filteredFleet.map((vehicle) => {
                const statusColor =
                  STATUS_META[vehicle.status]?.color || "#64748b";
                const active = selectedVehicle?.id === vehicle.id;
                return (
                  <button
                    type="button"
                    key={vehicle.id}
                    onClick={() => focusVehicle(vehicle, true)}
                    className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                      active
                        ? "border-blue-700 ring-2 ring-blue-700"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${statusColor}22` }}
                        >
                          <CarFront
                            className="h-5 w-5"
                            style={{ color: statusColor }}
                          />
                        </div>
                        <div>
                          <div className="text-lg font-black text-slate-900">
                            {vehicle.name}
                          </div>
                          <div className="text-sm font-semibold text-slate-400">
                            {vehicle.vehicleNumber}
                          </div>
                        </div>
                      </div>
                      <span
                        className="rounded-lg px-3 py-1 text-xs font-extrabold text-white"
                        style={{ backgroundColor: statusColor }}
                      >
                        {vehicle.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-y border-dashed border-slate-200 py-3">
                      <div>
                        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <Gauge className="h-3.5 w-3.5" />
                          Velocity
                        </div>
                        <div className="text-lg font-black text-slate-900">
                          {vehicle.velocity} KM/H
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <Zap className="h-3.5 w-3.5" />
                          Ignition
                        </div>
                        <div
                          className={`text-lg font-black ${
                            vehicle.ignition === "ON"
                              ? "text-emerald-500"
                              : "text-slate-400"
                          }`}
                        >
                          {vehicle.ignition}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        {vehicle.driver}
                      </div>
                      <div className="flex items-center gap-1.5 text-[#7c3aed]">
                        <Clock3 className="h-4 w-4" />
                        {vehicle.lastUpdate}
                      </div>
                    </div>
                  </button>
                );
              })}
            {!isFleetLoading && !fleetError && filteredFleet.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
                No vehicles match your filter.
              </div>
            )}
          </div>
        </aside>

        <main className="relative min-h-[68vh] overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {!hasApiKey && (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm font-semibold text-red-600">
              Google Maps key missing in env. Set `NEXT_PUBLIC_GOOGLE_MAPS_KEY`.
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
                zoom={12}
                options={mapOptions}
                onLoad={(map) => {
                  mapRef.current = map;
                }}
              >
                {fleetData.map((vehicle) => {
                  const trail = vehicleTrails[vehicle.id] || [];
                  return (
                    <Fragment key={vehicle.id}>
                      {trail.length > 1 && (
                        <PolylineF
                          path={trail}
                          options={{
                            strokeColor: "#1e3a8a",
                            strokeOpacity: 0,
                            strokeWeight: 3,
                            icons: [
                              {
                                icon: {
                                  path: "M 0,-1 0,1",
                                  strokeOpacity: 1,
                                  scale: 3,
                                  strokeColor: "#1e3a8a",
                                },
                                offset: "0",
                                repeat: "12px",
                              },
                            ],
                          }}
                        />
                      )}
                      <MarkerF
                        position={{
                          lat: vehicle.position[0],
                          lng: vehicle.position[1],
                        }}
                        icon={{
                          url: getCarMarkerSvg({
                            color:
                              STATUS_META[vehicle.status]?.color || "#64748b",
                            isActive: selectedVehicle?.id === vehicle.id,
                            strokeColor:
                              selectedVehicle?.id === vehicle.id
                                ? "#1e3a8a"
                                : "#0f172a",
                            direction: Number(vehicle?.raw?.direction || 0),
                          }),
                        }}
                        onClick={() => focusVehicle(vehicle, true)}
                      />
                    </Fragment>
                  );
                })}
              </GoogleMap>

              <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-white/95 px-4 py-2 shadow-lg">
                <div className="text-sm font-bold text-slate-900">
                  Live Tracking Active
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Monitoring {fleetData.length} vehicles
                </div>
              </div>

              {popupVehicle && (
                <div className="absolute left-1/2 top-6 w-[340px] max-w-[92%] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="text-[24px] font-black text-slate-900">
                        {popupVehicle.name}
                      </div>
                      <div
                        className="text-sm font-bold"
                        style={{
                          color:
                            STATUS_META[popupVehicle.status]?.color ||
                            "#64748b",
                        }}
                      >
                        {popupVehicle.status}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPopupVehicleId(null)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-y border-dashed border-slate-200 py-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Driver
                      </div>
                      <div className="text-base font-black text-slate-900">
                        {popupVehicle.driver}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Velocity
                      </div>
                      <div className="text-base font-black text-slate-900">
                        {popupVehicle.velocity} KM/H
                      </div>
                    </div>
                  </div>

                  {/* ✅ Added Buttons */}
                  <div className="mt-4 flex justify-between">
                    <button
                      onClick={() =>
                        router.push(
                          `/live-tracking/${popupVehicle.vehicleId || popupVehicle.id}`,
                        )
                      }
                      className="w-[48%] rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      Live Tracking
                    </button>
                    <button
                      onClick={() =>
                        router.push(
                          `/history-tracking-smooth/${popupVehicle.vehicleId || popupVehicle.id}`,
                        )
                      }
                      className="w-[48%] rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      History Tracking
                    </button>
                  </div>
                </div>
              )}

              <div className="absolute right-4 top-4 flex flex-col gap-2">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#6d28d9] text-white shadow-lg"
                >
                  <Settings2 className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg"
                >
                  <Layers3 className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </main>
          </div>
        </div>
      </div>
    </div>
  );
}
