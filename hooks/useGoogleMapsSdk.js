"use client";

import { useJsApiLoader } from "@react-google-maps/api";
import {
  getGoogleMapsApiKey,
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAPS_SCRIPT_ID,
} from "./googleMapsConfig";

export function useGoogleMapsSdk() {
  const key = getGoogleMapsApiKey();

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: key,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  return {
    isLoaded,
    loadError,
    hasApiKey: Boolean(key),
  };
}
