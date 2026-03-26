"use client";

import React from "react";
import {
  GoogleMap,
  Circle,
  Polygon,
  DrawingManager,
} from "@react-google-maps/api";
import type { GeofenceZone } from "@/interfaces/geofence.interface";

const MAP_CONTAINER_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
};

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

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

interface Props {
  zones: GeofenceZone[];
  isDark: boolean;
  onMapLoad?: (map: google.maps.Map) => void;
  drawingMode?: google.maps.drawing.OverlayType | null;
  drawingColor?: string;
  onCircleComplete?: (circle: google.maps.Circle) => void;
  onPolygonComplete?: (polygon: google.maps.Polygon) => void;
  showDrawingManager?: boolean;
  zoom?: number;
  center?: { lat: number; lng: number };
  editablePreviewZone?: boolean;
  onEditableCircleChange?: (value: {
    center: { lat: number; lng: number };
    radius: number;
  }) => void;
  onEditablePolygonChange?: (paths: { lat: number; lng: number }[]) => void;
}

const GeofenceMap: React.FC<Props> = ({
  zones,
  isDark,
  onMapLoad,
  drawingMode = null,
  drawingColor = "#ef4444",
  onCircleComplete,
  onPolygonComplete,
  showDrawingManager = false,
  zoom = 11,
  center = DEFAULT_CENTER,
  editablePreviewZone = false,
  onEditableCircleChange,
  onEditablePolygonChange,
}) => {
  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={center}
      zoom={zoom}
      onLoad={onMapLoad}
      options={{
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        draggable: true,
        gestureHandling: "greedy",
        styles: isDark ? DARK_MAP_STYLES : [],
      }}
    >
      {/* Render existing zones */}
      {zones.map((zone) => {
        if (zone.geometry === "circle" && zone.center && zone.radius) {
          return (
            <Circle
              key={zone.id}
              center={zone.center}
              radius={zone.radius}
              onLoad={(circle) => {
                if (!editablePreviewZone || !onEditableCircleChange) return;
                const emitCircle = () => {
                  const c = circle.getCenter();
                  if (!c) return;
                  onEditableCircleChange({
                    center: { lat: c.lat(), lng: c.lng() },
                    radius: Math.round(circle.getRadius()),
                  });
                };

                emitCircle();
                const centerListener = google.maps.event.addListener(
                  circle,
                  "center_changed",
                  emitCircle,
                );
                const radiusListener = google.maps.event.addListener(
                  circle,
                  "radius_changed",
                  emitCircle,
                );
                (circle as unknown as { __fbListeners?: google.maps.MapsEventListener[] }).__fbListeners = [
                  centerListener,
                  radiusListener,
                ];
              }}
              onUnmount={(circle) => {
                const listeners = (
                  circle as unknown as {
                    __fbListeners?: google.maps.MapsEventListener[];
                  }
                ).__fbListeners;
                listeners?.forEach((listener) =>
                  google.maps.event.removeListener(listener),
                );
              }}
              options={{
                fillColor: zone.color,
                fillOpacity: 0.15,
                strokeColor: zone.color,
                strokeWeight: 2,
                strokeOpacity: zone.status === "enabled" ? 1 : 0.4,
                editable: editablePreviewZone,
                draggable: editablePreviewZone,
              }}
            />
          );
        }
        if (zone.geometry === "polygon" && zone.paths) {
          return (
            <Polygon
              key={zone.id}
              paths={zone.paths}
              onLoad={(polygon) => {
                if (!editablePreviewZone || !onEditablePolygonChange) return;
                const emitPolygon = () => {
                  const nextPaths = polygon
                    .getPath()
                    .getArray()
                    .map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }));
                  onEditablePolygonChange(nextPaths);
                };

                emitPolygon();
                const path = polygon.getPath();
                const setAt = google.maps.event.addListener(
                  path,
                  "set_at",
                  emitPolygon,
                );
                const insertAt = google.maps.event.addListener(
                  path,
                  "insert_at",
                  emitPolygon,
                );
                const removeAt = google.maps.event.addListener(
                  path,
                  "remove_at",
                  emitPolygon,
                );
                const dragEnd = google.maps.event.addListener(
                  polygon,
                  "dragend",
                  emitPolygon,
                );
                (polygon as unknown as {
                  __fbListeners?: google.maps.MapsEventListener[];
                }).__fbListeners = [setAt, insertAt, removeAt, dragEnd];
              }}
              onUnmount={(polygon) => {
                const listeners = (
                  polygon as unknown as {
                    __fbListeners?: google.maps.MapsEventListener[];
                  }
                ).__fbListeners;
                listeners?.forEach((listener) =>
                  google.maps.event.removeListener(listener),
                );
              }}
              options={{
                fillColor: zone.color,
                fillOpacity: 0.15,
                strokeColor: zone.color,
                strokeWeight: 2,
                strokeOpacity: zone.status === "enabled" ? 1 : 0.4,
                editable: editablePreviewZone,
                draggable: editablePreviewZone,
              }}
            />
          );
        }
        return null;
      })}

      {/* Drawing Manager */}
      {showDrawingManager && drawingMode && (
        <DrawingManager
          drawingMode={drawingMode}
          onCircleComplete={onCircleComplete}
          onPolygonComplete={onPolygonComplete}
          options={{
            drawingControl: false,
            circleOptions: {
              fillColor: drawingColor,
              fillOpacity: 0.2,
              strokeColor: drawingColor,
              strokeWeight: 2,
              editable: true,
            },
            polygonOptions: {
              fillColor: drawingColor,
              fillOpacity: 0.2,
              strokeColor: drawingColor,
              strokeWeight: 2,
              editable: true,
            },
          }}
        />
      )}
    </GoogleMap>
  );
};

export default GeofenceMap;
