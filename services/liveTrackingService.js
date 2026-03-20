import axios from "axios";
import api, { vtsApi } from "./apiService";

const LIVE_TRACKING_BASE_URL = "/live-tracking-proxy";

const liveTrackingApi = axios.create({
  baseURL: LIVE_TRACKING_BASE_URL,
});

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function pickFirst(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }
  return undefined;
}

function normalizeStatus(rawStatus, speed, ignition) {
  const status = asString(rawStatus).toUpperCase().replaceAll("-", "_");
  const ign = asString(ignition).toUpperCase();

  if (status.includes("BREAK")) return "BREAKDOWN";
  if (status.includes("EXPIRE")) return "EXPIRED";
  if (status.includes("OFFLINE") || status.includes("NO_SIGNAL"))
    return "OFFLINE";
  if (status.includes("PARK")) return "PARKED";
  if (status.includes("IDL")) return "IDLING";
  if (status.includes("MOVE") || status.includes("RUN")) return "MOVING";

  if (speed > 0) return "MOVING";
  if (ign === "ON" || ign === "1" || ign === "TRUE") return "IDLING";
  return "PARKED";
}

function normalizeLiveTrackingRecord(record, fallbackVehicleNo = "", idx = 0) {
  const lat = asNumber(
    pickFirst(record, ["lat", "latitude", "gpsLat", "gpsLatitude", "y"]),
  );
  const lng = asNumber(
    pickFirst(record, [
      "lng",
      "lon",
      "longitude",
      "gpsLng",
      "gpsLongitude",
      "x",
    ]),
  );

  if (lat === null || lng === null) return null;

  const vehicleNo =
    asString(
      pickFirst(record, [
        "vehicleNo",
        "vehicleNumber",
        "registrationNo",
        "registrationNumber",
        "vehicle",
        "vehicleno",
      ]),
    ) || fallbackVehicleNo;
  const vehicleId = asString(
    pickFirst(record, ["vehicleId", "VehicleId", "id", "Id"]),
  );

  const speed =
    asNumber(pickFirst(record, ["speed", "speedKmph", "velocity", "spd"])) ?? 0;
  const ignitionRaw = pickFirst(record, ["ignition", "ignitionStatus", "ign"]);
  const ignition = (() => {
    const value = asString(ignitionRaw).toUpperCase();
    if (value === "1" || value === "ON" || value === "TRUE") return "ON";
    if (value === "0" || value === "OFF" || value === "FALSE") return "OFF";
    return speed > 0 ? "ON" : "OFF";
  })();

  const status = normalizeStatus(
    pickFirst(record, ["status", "vehicleStatus", "state"]),
    speed,
    ignition,
  );

  return {
    id: vehicleNo || `vehicle-${idx}`,
    vehicleId: vehicleId || vehicleNo || `vehicle-${idx}`,
    name: vehicleNo || `Vehicle ${idx + 1}`,
    vehicleNumber: vehicleNo || `Vehicle ${idx + 1}`,
    status,
    velocity: Math.round(speed),
    ignition,
    driver:
      asString(pickFirst(record, ["driverName", "driver", "driverFullName"])) ||
      "Unknown Driver",
    lastUpdate:
      asString(
        pickFirst(record, [
          "lastUpdate",
          "updatedAt",
          "timestamp",
          "gpsTime",
          "gpsDate",
          "receivedAt",
        ]),
      ) || "Live",
    position: [lat, lng],
    imei: asString(
      pickFirst(record, ["imei", "IMEI", "deviceImei", "DeviceIMEI", "deviceNo"]),
    ),
    raw: record,
  };
}

function getStoredAccountId() {
  if (typeof window === "undefined") return 0;
  const selectedAccountId = Number(localStorage.getItem("accountId") || 0);
  if (selectedAccountId > 0) return selectedAccountId;
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userAccountId = Number(user?.accountId || 0);
    return userAccountId > 0 ? userAccountId : 0;
  } catch {
    return 0;
  }
}

export async function getLiveTrackingBatch(orgId) {
  const resolvedOrgId =
    Number(orgId || 0) > 0 ? Number(orgId) : Number(getStoredAccountId() || 0);
  const requestConfig =
    resolvedOrgId > 0 ? { params: { orgId: resolvedOrgId } } : {};
  console.groupCollapsed(
    `[LiveTrackingBatch] requesting orgId=${resolvedOrgId || "none"}`,
  );
  console.log("requestConfig", requestConfig);
  const { data } = await api.get("/api/live-tracking/batch", requestConfig);
  console.log("rawResponse", data);
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.vehicles)
        ? data.vehicles
        : [];

  const normalizedRows = rows
    .map((row, index) => normalizeLiveTrackingRecord(row, "", index))
    .filter(Boolean);
  console.log("normalizedRows", normalizedRows);
  console.groupEnd();
  return normalizedRows;
}

export async function getLiveTrackingByKey(vehicleNo) {
  const key = `dashboard::${vehicleNo}`;
  const { data } = await liveTrackingApi.get("/api/live-tracking", {
    params: { key },
  });
  const payload =
    data?.data && typeof data.data === "object" && !Array.isArray(data.data)
      ? data.data
      : data;
  return normalizeLiveTrackingRecord(payload, vehicleNo);
}

// Fetch live tracking data for a specific Redis key
export const getLiveTrackingData = async (key) => {
  if (!key) throw new Error("Redis key is required");
  try {
    const res = await vtsApi.get("/api/redis/get", {
      params: { key },
    });
    return res.data;
  } catch (err) {
    if (err.response) {
      console.error("[getLiveTrackingData] Error Response:", err.response);
    } else {
      console.error("[getLiveTrackingData] Error:", err);
    }
    throw err;
  }
};
