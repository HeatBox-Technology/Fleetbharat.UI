"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Autocomplete,
} from "@react-google-maps/api";
import { MapPin, X, Check, Loader2, Search } from "lucide-react";
import {
  getGoogleMapsApiKey,
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAPS_SCRIPT_ID,
} from "@/hooks/googleMapsConfig";

export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (loc: PickedLocation) => void;
  initialLocation?: { lat: number; lng: number };
  isDark?: boolean;
  googleMapsApiKey: string;
}

const DEFAULT_CENTER = { lat: 28.4595, lng: 77.0266 };

const DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0f1117" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a5568" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1e2330" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0f1117" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2d3748" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748b" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0a0e1a" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#131929" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0d1a0d" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1a1f2e" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e2330" }],
  },
];

const LIGHT_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: "all",
    elementType: "geometry",
    stylers: [{ color: "#f8fafc" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#e2e8f0" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#bfdbfe" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#dcfce7" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#f1f5f9" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#e2e8f0" }],
  },
  { elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f8fafc" }] },
];

export default function MapLocationPicker({
  isOpen,
  onClose,
  onSelect,
  initialLocation = DEFAULT_CENTER,
  isDark = false,
  googleMapsApiKey,
}: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: googleMapsApiKey || getGoogleMapsApiKey(),
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [markerPos, setMarkerPos] =
    useState<google.maps.LatLngLiteral>(initialLocation);
  const [searchInput, setSearchInput] = useState("");
  const [latInput, setLatInput] = useState(String(initialLocation.lat));
  const [lngInput, setLngInput] = useState(String(initialLocation.lng));
  const [address, setAddress] = useState("");
  const [revLoading, setRevLoading] = useState(false);
  const [mapInst, setMapInst] = useState<google.maps.Map | null>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!window.google) return;
    setRevLoading(true);
    new window.google.maps.Geocoder().geocode(
      { location: { lat, lng } },
      (res, st) => {
        setRevLoading(false);
        setAddress(
          st === "OK" && res?.[0]
            ? res[0].formatted_address
            : `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        );
      },
    );
  }, []);

  const setMarkerAndFocus = useCallback(
    (lat: number, lng: number, nextAddress?: string) => {
      setMarkerPos({ lat, lng });
      setLatInput(String(lat));
      setLngInput(String(lng));
      if (typeof nextAddress === "string" && nextAddress.trim()) {
        setAddress(nextAddress);
      } else {
        reverseGeocode(lat, lng);
      }
      mapInst?.panTo({ lat, lng });
      mapInst?.setZoom(16);
    },
    [mapInst, reverseGeocode],
  );

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat(),
        lng = e.latLng.lng();
      setMarkerAndFocus(lat, lng);
    },
    [setMarkerAndFocus],
  );

  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat(),
        lng = e.latLng.lng();
      setMarkerAndFocus(lat, lng);
    },
    [setMarkerAndFocus],
  );

  const handlePlaceChanged = useCallback(() => {
    const place = acRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const formatted = place.formatted_address ?? place.name ?? "";
    setSearchInput(formatted);
    setMarkerAndFocus(lat, lng, formatted);
  }, [setMarkerAndFocus]);

  const parseLatLngInput = (input: string): { lat: number; lng: number } | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/\s+/g, " ");
    const parts =
      normalized.includes(",")
        ? normalized.split(",")
        : normalized.split(" ");
    if (parts.length < 2) return null;
    const lat = Number(parts[0]?.trim());
    const lng = Number(parts[1]?.trim());
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  };

  const handleSearchSubmit = useCallback(() => {
    const text = searchInput.trim();
    if (!text || !window.google) return;

    const parsed = parseLatLngInput(text);
    if (parsed) {
      setMarkerAndFocus(parsed.lat, parsed.lng);
      return;
    }

    new window.google.maps.Geocoder().geocode({ address: text }, (res, st) => {
      if (st === "OK" && res?.[0]?.geometry?.location) {
        const lat = res[0].geometry.location.lat();
        const lng = res[0].geometry.location.lng();
        setMarkerAndFocus(lat, lng, res[0].formatted_address || text);
      }
    });
  }, [searchInput, setMarkerAndFocus]);

  const handleLatLngLocate = useCallback(() => {
    const lat = Number(latInput);
    const lng = Number(lngInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    setMarkerAndFocus(lat, lng);
  }, [latInput, lngInput, setMarkerAndFocus]);

  useEffect(() => {
    if (!isOpen) return;
    const lat = Number(initialLocation.lat || DEFAULT_CENTER.lat);
    const lng = Number(initialLocation.lng || DEFAULT_CENTER.lng);
    setMarkerPos({ lat, lng });
    setLatInput(String(lat));
    setLngInput(String(lng));
    setSearchInput("");
    if (isLoaded) {
      reverseGeocode(lat, lng);
    }
  }, [isOpen, initialLocation, isLoaded, reverseGeocode]);

  const handleConfirm = () => {
    onSelect({ ...markerPos, address });
    onClose();
  };

  // Theme tokens
  const bg = isDark ? "#0f1117" : "#ffffff";
  const surface = isDark ? "#131929" : "#f8fafc";
  const bd = isDark ? "#1e2330" : "#e2e8f0";
  const tx = isDark ? "#f1f5f9" : "#0f172a";
  const mu = isDark ? "#64748b" : "#94a3b8";
  const inBg = isDark ? "#0f1117" : "#ffffff";
  const acc = "#6366f1";

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <style>{`
                @keyframes mapIn {
                  from { opacity:0; transform: scale(0.97) translateY(10px) }
                  to   { opacity:1; transform: scale(1)    translateY(0) }
                }
                @keyframes spin { to { transform: rotate(360deg) } }
                .loc-spin { animation: spin 1s linear infinite; }
            `}</style>

      <div
        style={{
          width: "min(860px,100%)",
          maxHeight: "min(660px,90vh)",
          background: bg,
          border: `1px solid ${bd}`,
          borderRadius: 18,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: isDark
            ? "0 40px 100px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)"
            : "0 40px 100px rgba(0,0,0,0.12)",
          animation: "mapIn 0.22s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "13px 18px",
            borderBottom: `1px solid ${bd}`,
            background: surface,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              flexShrink: 0,
              background: `linear-gradient(135deg,${acc},#818cf8)`,
              boxShadow: `0 4px 12px ${acc}50`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MapPin size={16} color="white" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: tx,
                letterSpacing: "0.12em",
                fontFamily: "monospace",
                lineHeight: 1.1,
              }}
            >
              PICK LOCATION
            </p>
            <p style={{ fontSize: 10, color: mu, marginTop: 2 }}>
              Search · Click map · Drag pin to fine-tune
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${bd}`,
              background: "transparent",
              color: mu,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Places Autocomplete search bar ── */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: `1px solid ${bd}`,
            background: surface,
            flexShrink: 0,
          }}
        >
          {isLoaded ? (
            <Autocomplete
              onLoad={(ac) => (acRef.current = ac)}
              onPlaceChanged={handlePlaceChanged}
            >
              <div style={{ position: "relative" }}>
                <Search
                  size={13}
                  color={mu}
                  style={{
                    position: "absolute",
                    left: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search address, city, landmark…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchSubmit();
                    }
                  }}
                  style={{
                    width: "100%",
                    paddingLeft: 32,
                    paddingRight: 96,
                    paddingTop: 9,
                    paddingBottom: 9,
                    background: inBg,
                    border: `1.5px solid ${bd}`,
                    borderRadius: 10,
                    color: tx,
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = acc;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${acc}22`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = bd;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 10px",
                    background: `linear-gradient(135deg,${acc},#818cf8)`,
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}
                >
                  SEARCH
                </button>
              </div>
            </Autocomplete>
          ) : (
            <div
              style={{
                height: 40,
                background: isDark ? "#1e2330" : "#f1f5f9",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: mu,
                fontSize: 12,
              }}
            >
              <Loader2 size={13} className="loc-spin" />
              Loading Places API…
            </div>
          )}
          <div
            style={{
              marginTop: 8,
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 8,
            }}
          >
            <input
              type="number"
              step="0.000001"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              placeholder="Latitude"
              style={{
                width: "100%",
                padding: "9px 10px",
                background: inBg,
                border: `1.5px solid ${bd}`,
                borderRadius: 10,
                color: tx,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <input
              type="number"
              step="0.000001"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              placeholder="Longitude"
              style={{
                width: "100%",
                padding: "9px 10px",
                background: inBg,
                border: `1.5px solid ${bd}`,
                borderRadius: 10,
                color: tx,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={handleLatLngLocate}
              style={{
                padding: "9px 12px",
                background: "transparent",
                border: `1.5px solid ${bd}`,
                borderRadius: 10,
                color: tx,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.06em",
              }}
            >
              LOCATE
            </button>
          </div>
        </div>

        {/* ── Map ── */}
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          {loadError && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                color: "#ef4444",
              }}
            >
              <MapPin size={36} />
              <p style={{ fontWeight: 700, fontSize: 14 }}>
                Failed to load Google Maps
              </p>
              <p style={{ fontSize: 11, color: mu }}>
                Check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
              </p>
            </div>
          )}
          {!isLoaded && !loadError && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                color: mu,
                fontSize: 13,
                background: isDark ? "#0f1117" : "#f8fafc",
              }}
            >
              <Loader2 size={18} className="loc-spin" /> Initialising map…
            </div>
          )}
          {isLoaded && (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={markerPos}
              zoom={14}
              onClick={handleMapClick}
              onLoad={setMapInst}
              options={{
                styles: isDark ? DARK_STYLES : LIGHT_STYLES,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                clickableIcons: false,
                gestureHandling: "greedy",
              }}
            >
              <Marker
                position={markerPos}
                draggable
                onDragEnd={handleDragEnd}
                icon={{
                  path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                  fillColor: acc,
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                  scale: 1.9,
                  anchor: new window.google.maps.Point(12, 22),
                }}
              />
            </GoogleMap>
          )}
          {/* Hint pill */}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              background: isDark
                ? "rgba(15,17,23,0.82)"
                : "rgba(255,255,255,0.88)",
              border: `1px solid ${bd}`,
              borderRadius: 20,
              padding: "4px 14px",
              fontSize: 9,
              color: mu,
              letterSpacing: "0.1em",
              fontFamily: "monospace",
              fontWeight: 700,
              pointerEvents: "none",
              backdropFilter: "blur(8px)",
              whiteSpace: "nowrap",
            }}
          >
            CLICK TO PIN · DRAG TO FINE-TUNE
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "11px 16px",
            borderTop: `1px solid ${bd}`,
            background: surface,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.14em",
                color: mu,
                fontFamily: "monospace",
                marginBottom: 2,
              }}
            >
              SELECTED LOCATION
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
              }}
            >
              {revLoading && (
                <Loader2
                  size={11}
                  color={mu}
                  className="loc-spin"
                  style={{ flexShrink: 0 }}
                />
              )}
              <p
                style={{
                  fontSize: 12,
                  color: revLoading ? mu : tx,
                  fontStyle: revLoading ? "italic" : "normal",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {revLoading
                  ? "Resolving address…"
                  : address || "Click the map to select a location"}
              </p>
            </div>
            <p
              style={{
                fontSize: 10,
                color: mu,
                fontFamily: "monospace",
                marginTop: 2,
              }}
            >
              {markerPos.lat.toFixed(6)}, {markerPos.lng.toFixed(6)}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: "8px 14px",
              background: "transparent",
              border: `1px solid ${bd}`,
              borderRadius: 10,
              color: mu,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 20px",
              background: `linear-gradient(135deg,${acc},#818cf8)`,
              color: "white",
              border: "none",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
              flexShrink: 0,
              letterSpacing: "0.08em",
              fontFamily: "monospace",
              boxShadow: `0 4px 16px ${acc}40`,
            }}
          >
            <Check size={13} strokeWidth={3} /> CONFIRM LOCATION
          </button>
        </div>
      </div>
    </div>
  );
}
