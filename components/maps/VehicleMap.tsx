"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  InfoWindow,
  MarkerF,
  PolylineF,
} from "@react-google-maps/api";
// import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { RoutePoint, Vehicle } from "@/lib/mapTypes";

type Props = {
  vehicles: Vehicle[];
  // optional route overlay
  route?: RoutePoint[];
  // running vehicle position (for playback)
  runner?: { lat: number; lng: number; heading?: number | undefined } | null;
  zoom?: number;
  center?: { lat: number; lng: number };
  height?: string;
  onVehicleClick?: (v: Vehicle) => void;
  liveRoute?: { lat: number; lng: number }[];
  bounds?: google.maps.LatLngBounds | null;
};

export default function VehicleMap({
  vehicles,
  route,
  runner,
  zoom = 6,
  center = { lat: 20.5937, lng: 78.9629 },
  height = "80vh",
  onVehicleClick,
  liveRoute,
  bounds,
}: Props) {
  // GoogleMap onLoad handler
  const onLoad = (map: google.maps.Map) => {
    // Auto-fit bounds if provided (for multi-vehicle)
    if (bounds && vehicles.length > 1) {
      map.fitBounds(bounds, 80); // 80px padding
    }
  };
  // Map style
  const mapStyle = useMemo<React.CSSProperties>(
    () => ({ width: "100%", height, borderRadius: 12 }),
    [height],
  );

  // Selected vehicle state
  const [selected, setSelected] = useState<Vehicle | null>(null);

  // Route path for polyline
  const routePath = useMemo(
    () =>
      route?.length ? route.map((p) => ({ lat: p.lat, lng: p.lng })) : null,
    [route],
  );

  // Validate center coordinates
  const validCenter = useMemo(() => {
    const isValid =
      typeof center?.lat === "number" &&
      typeof center?.lng === "number" &&
      isFinite(center.lat) &&
      isFinite(center.lng);
    return isValid ? center : { lat: 20.5937, lng: 78.9629 };
  }, [center]);
  return (
    <GoogleMap
      mapContainerStyle={mapStyle}
      center={validCenter}
      zoom={zoom}
      onLoad={onLoad}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      {/* Route polyline */}
      {routePath && (
        <PolylineF
          path={routePath}
          options={{ strokeOpacity: 0.9, strokeWeight: 4 }}
        />
      )}

      {/* Show live route trace line for single vehicle as green dotted */}
      {vehicles.length === 1 &&
        Array.isArray(liveRoute) &&
        liveRoute.length > 1 && (
          <PolylineF
            path={liveRoute}
            options={{
              strokeColor: "#2DD4BF", // teal-400
              strokeOpacity: 0.95,
              strokeWeight: 6,
              zIndex: 2,
              icons: [
                {
                  icon: {
                    path: "M 0,-1 0,1",
                    strokeOpacity: 1,
                    scale: 5,
                    strokeColor: "#2DD4BF",
                  },
                  offset: "0",
                  repeat: "18px",
                },
              ],
            }}
          />
        )}

      {/* Show live route trace lines for all vehicles if more than one vehicle is present */}
      {vehicles.length > 1 && (
        <>
          {vehicles.map((v, idx) => {
            // Assign a unique color per vehicle
            const colors = [
              "#e6194b",
              "#3cb44b",
              "#ffe119",
              "#4363d8",
              "#f58231",
              "#911eb4",
              "#46f0f0",
              "#f032e6",
              "#bcf60c",
              "#fabebe",
              "#008080",
              "#e6beff",
              "#9a6324",
              "#fffac8",
              "#800000",
              "#aaffc3",
              "#808000",
              "#ffd8b1",
              "#000075",
              "#808080",
            ];
            const color = colors[idx % colors.length];
            // If v.liveRoute exists, draw it, else just a dot
            if (Array.isArray(v.liveRoute) && v.liveRoute.length > 1) {
              return (
                <PolylineF
                  key={v.id + "-route"}
                  path={v.liveRoute}
                  options={{
                    strokeColor: color,
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                    zIndex: 2,
                  }}
                />
              );
            }
            return null;
          })}
        </>
      )}

      {/* Animated vehicle markers for all vehicles with unique color */}
      {vehicles.length > 1
        ? vehicles.map((v, idx) => {
            const colors = [
              "#e6194b",
              "#3cb44b",
              "#ffe119",
              "#4363d8",
              "#f58231",
              "#911eb4",
              "#46f0f0",
              "#f032e6",
              "#bcf60c",
              "#fabebe",
              "#008080",
              "#e6beff",
              "#9a6324",
              "#fffac8",
              "#800000",
              "#aaffc3",
              "#808000",
              "#ffd8b1",
              "#000075",
              "#808080",
            ];
            const color = colors[idx % colors.length];
            // Guard: skip if lat/lng are not valid numbers
            if (
              typeof v.lat !== "number" ||
              typeof v.lng !== "number" ||
              !isFinite(v.lat) ||
              !isFinite(v.lng)
            ) {
              return null;
            }
            return (
              <MarkerF
                key={v.id + "-marker"}
                position={{ lat: v.lat, lng: v.lng }}
                icon={{
                  url:
                    "data:image/svg+xml;utf-8," +
                    encodeURIComponent(`
                      <svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'>
                        <circle cx='30' cy='30' r='14' fill='${color}' stroke='black' stroke-width='3'/>
                        <circle cx='30' cy='30' r='22' fill='none' stroke='${color}' stroke-width='4'>
                          <animate attributeName='r' values='22;30;22' dur='1.2s' repeatCount='indefinite' />
                          <animate attributeName='opacity' values='0.6;0;0.6' dur='1.2s' repeatCount='indefinite' />
                        </circle>
                      </svg>
                    `),
                  scaledSize: new window.google.maps.Size(60, 60),
                  anchor: new window.google.maps.Point(30, 30),
                }}
                onClick={() => setSelected(v)}
              />
            );
          })
        : runner && (
            <MarkerF
              position={{ lat: runner.lat, lng: runner.lng }}
              icon={{
                url:
                  "data:image/svg+xml;utf-8," +
                  encodeURIComponent(`
                    <svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'>
                      <g>
                        <rect x='8' y='8' width='40' height='40' rx='12' fill='#fff' stroke='#2DD4BF' stroke-width='4'/>
                        <circle cx='28' cy='28' r='14' fill='#2DD4BF'/>
                        <path d='M28 18 L28 38' stroke='#fff' stroke-width='4' stroke-linecap='round'/>
                        <polygon points='24,34 28,38 32,34' fill='#fff'/>
                      </g>
                    </svg>
                  `),
                scaledSize: new window.google.maps.Size(56, 56),
                anchor: new window.google.maps.Point(28, 28),
              }}
              onClick={() => setSelected(vehicles[0])}
            />
          )}

      {/* Selected vehicle info window (uses MarkerF position only) */}
      {selected && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => setSelected(null)}
        >
          <div style={{ minWidth: 240 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {selected.name ?? selected.id}
            </div>
            <div>
              <b>Lat:</b> {selected.lat}
            </div>
            <div>
              <b>Lng:</b> {selected.lng}
            </div>
            <div>
              <b>Speed:</b> {selected.speed ?? "-"} km/h
            </div>
            <div>
              <b>Heading:</b> {selected.heading ?? "-"}°
            </div>
            <div>
              <b>Time:</b> {selected.timestamp ?? "-"}
            </div>
            {selected.status && (
              <div>
                <b>Status:</b> {selected.status}
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
