"use client";

import {
  Circle,
  DirectionsRenderer,
  GoogleMap,
  Polygon,
  Polyline,
} from "@react-google-maps/api";
import { AlertCircle } from "lucide-react";

type GeofenceOverlay =
  | {
      geoId: number;
      geometry: "circle";
      center: google.maps.LatLngLiteral;
      radiusM: number;
      paths?: undefined;
    }
  | {
      geoId: number;
      geometry: "polygon";
      center: google.maps.LatLngLiteral;
      radiusM?: undefined;
      paths: google.maps.LatLngLiteral[];
    };

export default function TripPlannerMapPreview({
  loadError,
  isLoaded,
  center,
  routingModel,
  directionsResult,
  geofenceOverlays,
  predefinedRoutePolyline,
  standardPolyline,
  onMapLoad,
}: {
  loadError: unknown;
  isLoaded: boolean;
  center: google.maps.LatLngLiteral;
  routingModel: "standard" | "dynamic";
  directionsResult: google.maps.DirectionsResult | null;
  geofenceOverlays: GeofenceOverlay[];
  predefinedRoutePolyline: google.maps.LatLngLiteral[];
  standardPolyline: google.maps.LatLngLiteral[];
  onMapLoad: (map: google.maps.Map) => void;
}) {
  return (
    <div className="relative h-[320px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
      {loadError ? (
        <div className="h-full flex items-center justify-center bg-rose-50 text-rose-600 text-sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          Maps failed to load
        </div>
      ) : !isLoaded ? (
        <div className="h-full flex items-center justify-center text-slate-600 text-sm">
          Loading map...
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={6}
          onLoad={onMapLoad}
          options={{
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          }}
        >
          {routingModel === "dynamic" && directionsResult ? (
            <DirectionsRenderer
              directions={directionsResult}
              options={{
                suppressMarkers: false,
                polylineOptions: {
                  strokeColor: "#4f46e5",
                  strokeWeight: 5,
                  strokeOpacity: 0.9,
                },
              }}
            />
          ) : null}

          {routingModel === "standard"
            ? geofenceOverlays.map((overlay) =>
                overlay.geometry === "circle" ? (
                  <Circle
                    key={`geo-circle-${overlay.geoId}`}
                    center={overlay.center}
                    radius={overlay.radiusM}
                    options={{
                      strokeColor: "#2563eb",
                      strokeOpacity: 0.9,
                      strokeWeight: 2,
                      fillColor: "#60a5fa",
                      fillOpacity: 0.18,
                      clickable: false,
                      draggable: false,
                      editable: false,
                      visible: true,
                    }}
                  />
                ) : (
                  <Polygon
                    key={`geo-poly-${overlay.geoId}`}
                    paths={overlay.paths}
                    options={{
                      strokeColor: "#2563eb",
                      strokeOpacity: 0.9,
                      strokeWeight: 2,
                      fillColor: "#60a5fa",
                      fillOpacity: 0.18,
                      clickable: false,
                      draggable: false,
                      editable: false,
                      geodesic: true,
                      visible: true,
                    }}
                  />
                ),
              )
            : null}

          {routingModel === "standard" && predefinedRoutePolyline.length > 1 ? (
            <Polyline
              path={predefinedRoutePolyline}
              options={{
                strokeColor: "#4f46e5",
                strokeWeight: 5,
                strokeOpacity: 0.9,
              }}
            />
          ) : routingModel === "standard" && standardPolyline.length > 1 ? (
            <Polyline
              path={standardPolyline}
              options={{
                strokeColor: "#f97316",
                strokeWeight: 4,
                strokeOpacity: 0.95,
              }}
            />
          ) : null}
        </GoogleMap>
      )}
    </div>
  );
}
