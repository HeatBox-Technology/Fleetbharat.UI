"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Circle,
  Polygon,
  DrawingManager,
} from "@react-google-maps/api";
import { useTheme } from "@/context/ThemeContext";
import { X, MapPin } from "lucide-react";
import {
  getGoogleMapsApiKey,
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAPS_SCRIPT_ID,
} from "@/hooks/googleMapsConfig";
import type {
  GeofenceZone,
  GeometryType,
  ZoneClassification,
} from "@/interfaces/geofence.interface";

/* ──────────────────────────── constants ──────────────────────────── */

const MAP_CONTAINER_STYLE: React.CSSProperties = {
  width: "100%",
  height: "190px",
};

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#6b7280",
];

const CLASSIFICATIONS: ZoneClassification[] = [
  "Warehouse",
  "Port",
  "Client Site",
  "Depot",
  "Restricted Area",
];

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2535" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d2535" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#304a7d" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
];

/* ──────────────────────────── props ──────────────────────────── */

interface Props {
  defaultGeometry: "circle" | "polygon";
  onClose: () => void;
  onSave: (zone: GeofenceZone) => void;
  existingZonesCount: number;
  accounts: { id: number; value: string }[];
  selectedAccountId: number;
  onAccountChange: (accountId: number) => void;
}

/* ──────────────────────────── component ──────────────────────────── */

const DefineNewZoneModal: React.FC<Props> = ({
  defaultGeometry,
  onClose,
  onSave,
  existingZonesCount,
  accounts,
  selectedAccountId,
  onAccountChange,
}) => {
  const { isDark } = useTheme();

  const [uniqueCode, setUniqueCode] = useState(
    `GF-${String(existingZonesCount + 1).padStart(4, "0")}`,
  );
  const [displayName, setDisplayName] = useState("");
  const [classification, setClassification] =
    useState<ZoneClassification>("Warehouse");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [geometry, setGeometry] = useState<GeometryType>(defaultGeometry);
  const [isEnabled, setIsEnabled] = useState(true);

  const [drawnCircle, setDrawnCircle] = useState<{
    center: { lat: number; lng: number };
    radius: number;
  } | null>(null);
  const [drawnPaths, setDrawnPaths] = useState<
    { lat: number; lng: number }[] | null
  >(null);

  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: getGoogleMapsApiKey(),
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const handleCircleComplete = useCallback((circle: google.maps.Circle) => {
    setDrawnCircle({
      center: {
        lat: circle.getCenter()!.lat(),
        lng: circle.getCenter()!.lng(),
      },
      radius: circle.getRadius(),
    });
    circle.setMap(null);
  }, []);

  const handlePolygonComplete = useCallback((polygon: google.maps.Polygon) => {
    const paths = polygon
      .getPath()
      .getArray()
      .map((ll) => ({ lat: ll.lat(), lng: ll.lng() }));
    setDrawnPaths(paths);
    polygon.setMap(null);
  }, []);

  const handleSwitchGeometry = (g: GeometryType) => {
    setGeometry(g);
    setDrawnCircle(null);
    setDrawnPaths(null);
  };

  const handleCommit = () => {
    const zone: GeofenceZone = {
      id: Date.now().toString(),
      code: uniqueCode,
      displayName,
      classification,
      geometry,
      status: isEnabled ? "enabled" : "disabled",
      color: selectedColor,
      ...(geometry === "circle" && drawnCircle
        ? { center: drawnCircle.center, radius: drawnCircle.radius }
        : {}),
      ...(geometry === "polygon" && drawnPaths ? { paths: drawnPaths } : {}),
    };
    onSave(zone);
  };

  /* ── style helpers ── */
  const inputCls = `w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20 ${
    isDark
      ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
      : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
  }`;

  const labelCls = `block text-[10px] font-bold tracking-widest mb-1.5 ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`;

  /* ── render ── */
  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm">
      {/* Slide-in panel */}
      <div
        className={`relative h-full w-full max-w-md flex flex-col shadow-2xl animate-slide-in-right ${
          isDark ? "bg-gray-900" : "bg-white"
        }`}
      >
        {/* ── Header ── */}
        <div
          className={`flex items-center gap-3 px-5 py-4 border-b ${
            isDark ? "border-gray-800" : "border-gray-100"
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center text-white font-bold text-base select-none">
            ✦
          </div>
          <div>
            <h2
              className={`text-base font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}
            >
              Define New Zone
            </h2>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
              Geofence Intelligence Core
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* ── Identity & Registry ── */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gray-400 text-xs">ℹ</span>
              <h3
                className={`text-[10px] font-bold tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                IDENTITY &amp; REGISTRY
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>
                  UNIQUE CODE <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uniqueCode}
                  onChange={(e) => setUniqueCode(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  DISPLAY NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Loading Bay 04"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls}>
                ACCOUNT <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => onAccountChange(Number(e.target.value))}
                className={inputCls}
              >
                <option value={0}>Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.value}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* ── Zone Classification ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400 text-xs">◈</span>
              <h3
                className={`text-[10px] font-bold tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                ZONE CLASSIFICATION
              </h3>
            </div>
            <select
              value={classification}
              onChange={(e) =>
                setClassification(e.target.value as ZoneClassification)
              }
              className={inputCls}
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              Used for automated trip reporting and safety rules.
            </p>
          </section>

          {/* ── Map Visualization ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400 text-xs">◉</span>
              <h3
                className={`text-[10px] font-bold tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                MAP VISUALIZATION
              </h3>
            </div>

            <label className={labelCls}>GEOFENCE COLOR THEME</label>
            <div
              className={`flex flex-wrap gap-2 p-3 rounded-xl border border-dashed ${
                isDark
                  ? "border-gray-700 bg-gray-800/40"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className="w-10 h-10 rounded-xl transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: color,
                    outline:
                      selectedColor === color ? `3px solid ${color}` : "none",
                    outlineOffset: "2px",
                    boxShadow:
                      selectedColor === color
                        ? `0 0 0 2px white, 0 0 0 4px ${color}`
                        : "none",
                  }}
                  title={color}
                />
              ))}
              <button
                className={`w-10 h-10 rounded-xl border-2 border-dashed text-lg flex items-center justify-center transition-colors ${
                  isDark
                    ? "border-gray-600 text-gray-400 hover:border-gray-500"
                    : "border-gray-300 text-gray-400 hover:border-gray-400"
                }`}
              >
                +
              </button>
            </div>
          </section>

          {/* ── Geometry Definition ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400 text-xs">◈</span>
              <h3
                className={`text-[10px] font-bold tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                GEOMETRY DEFINITION
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Circle */}
              <button
                onClick={() => handleSwitchGeometry("circle")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                  geometry === "circle"
                    ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                    : isDark
                      ? "border-gray-700 hover:border-gray-600"
                      : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    geometry === "circle"
                      ? "border-red-500 text-red-500"
                      : "border-gray-400 text-gray-400"
                  }`}
                >
                  ○
                </div>
                <div className="text-left">
                  <p
                    className={`text-xs font-bold ${
                      geometry === "circle"
                        ? "text-red-600"
                        : isDark
                          ? "text-gray-300"
                          : "text-gray-700"
                    }`}
                  >
                    CIRCLE
                  </p>
                  <p className="text-[10px] text-gray-400">RADIUS ZONE</p>
                </div>
              </button>

              {/* Polygon */}
              <button
                onClick={() => handleSwitchGeometry("polygon")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                  geometry === "polygon"
                    ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                    : isDark
                      ? "border-gray-700 hover:border-gray-600"
                      : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    geometry === "polygon"
                      ? "bg-red-500 text-white"
                      : isDark
                        ? "bg-gray-700 text-gray-300"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  ✦
                </div>
                <div className="text-left">
                  <p
                    className={`text-xs font-bold ${
                      geometry === "polygon"
                        ? "text-red-600"
                        : isDark
                          ? "text-gray-300"
                          : "text-gray-700"
                    }`}
                  >
                    POLYGON
                  </p>
                  <p className="text-[10px] text-gray-400">CUSTOM AREA</p>
                </div>
              </button>
            </div>

            {/* Mini map */}
            <div
              className={`rounded-xl overflow-hidden border ${
                isDark ? "border-gray-700" : "border-gray-200"
              }`}
            >
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={MAP_CONTAINER_STYLE}
                  center={DEFAULT_CENTER}
                  zoom={10}
                  options={{
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    zoomControl: true,
                    styles: isDark ? DARK_MAP_STYLES : [],
                  }}
                >
                  <DrawingManager
                    drawingMode={
                      geometry === "circle"
                        ? google.maps.drawing.OverlayType.CIRCLE
                        : google.maps.drawing.OverlayType.POLYGON
                    }
                    onCircleComplete={handleCircleComplete}
                    onPolygonComplete={handlePolygonComplete}
                    options={{
                      drawingControl: false,
                      circleOptions: {
                        fillColor: selectedColor,
                        fillOpacity: 0.2,
                        strokeColor: selectedColor,
                        strokeWeight: 2,
                      },
                      polygonOptions: {
                        fillColor: selectedColor,
                        fillOpacity: 0.2,
                        strokeColor: selectedColor,
                        strokeWeight: 2,
                        editable: true,
                      },
                    }}
                  />
                  {drawnCircle && (
                    <Circle
                      center={drawnCircle.center}
                      radius={drawnCircle.radius}
                      options={{
                        fillColor: selectedColor,
                        fillOpacity: 0.2,
                        strokeColor: selectedColor,
                        strokeWeight: 2,
                      }}
                    />
                  )}
                  {drawnPaths && (
                    <Polygon
                      paths={drawnPaths}
                      options={{
                        fillColor: selectedColor,
                        fillOpacity: 0.2,
                        strokeColor: selectedColor,
                        strokeWeight: 2,
                      }}
                    />
                  )}
                </GoogleMap>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
                </div>
              )}
            </div>

            {/* Interactive Plotting info */}
            <div
              className={`mt-3 rounded-xl border border-dashed px-4 py-4 flex flex-col items-center gap-1 ${
                isDark
                  ? "border-gray-700 bg-gray-800/40"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <MapPin className="w-5 h-5 text-gray-400" />
              <p
                className={`text-xs font-bold tracking-widest ${isDark ? "text-gray-300" : "text-gray-700"}`}
              >
                INTERACTIVE PLOTTING
              </p>
              <p className="text-[11px] text-gray-400 text-center">
                Adjustment can be made directly on the central map interface.
              </p>
            </div>
          </section>

          {/* ── Lifecycle Status ── */}
          <section>
            <div
              className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                isDark ? "bg-gray-800" : "bg-gray-50"
              }`}
            >
              <div>
                <p
                  className={`text-[10px] font-bold tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  LIFECYCLE STATUS
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  ENABLE ZONE FOR ACTIVE BEHAVIORAL MONITORING.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold ${
                    isEnabled ? "text-emerald-600" : "text-gray-400"
                  }`}
                >
                  {isEnabled ? "ENABLED" : "DISABLED"}
                </span>
                <button
                  onClick={() => setIsEnabled((p) => !p)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    isEnabled
                      ? "bg-indigo-500"
                      : isDark
                        ? "bg-gray-700"
                        : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      isEnabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* ── Footer ── */}
        <div
          className={`flex items-center gap-3 px-5 py-4 border-t ${
            isDark ? "border-gray-800" : "border-gray-100"
          }`}
        >
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm border transition-colors ${
              isDark
                ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            DISCARD
          </button>
          <button
            onClick={handleCommit}
            disabled={!selectedAccountId || !uniqueCode || !displayName}
            className="flex-[2] py-2.5 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            📋 COMMIT ZONE ENTRY
          </button>
        </div>
      </div>
    </div>
  );
};

export default DefineNewZoneModal;
