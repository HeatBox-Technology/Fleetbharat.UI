"use client";

export const GOOGLE_MAPS_SCRIPT_ID = "fleetbharat-google-map-script";

/** @type {import("@react-google-maps/api").Library[]} */
export const GOOGLE_MAPS_LIBRARIES = ["drawing", "geometry", "places"];

export function getGoogleMapsApiKey() {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  );
}
