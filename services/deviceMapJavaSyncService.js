import { javaApi } from "./apiService";

const STORAGE_KEY = "deviceMapJavaSyncStatus";
const inFlightVehicleMappingSyncs = new Map();

export const JAVA_SYNC_STATUS = {
  UNSYNCED: "UNSYNCED",
  SYNCING: "SYNCING",
  SYNCED: "SYNCED",
  FAILED: "FAILED",
};

const readStore = () => {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeStore = (store) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const getDeviceMapSyncStatusMap = () => readStore();

export const getDeviceMapSyncStatus = (mappingId) => {
  const key = String(mappingId || "");
  if (!key) return null;
  return readStore()[key] || null;
};

export const setDeviceMapSyncStatus = (mappingId, status) => {
  const key = String(mappingId || "");
  if (!key) return;

  const store = readStore();
  store[key] = {
    ...store[key],
    ...status,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
};

export const clearDeviceMapSyncStatus = (mappingId) => {
  const key = String(mappingId || "");
  if (!key) return;

  const store = readStore();
  delete store[key];
  writeStore(store);
};

const normalizeNumber = (value) => Number(value || 0);
const normalizeString = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";

  const lowered = normalized.toLowerCase();
  if (lowered === "undefined" || lowered === "null") {
    return "";
  }

  return normalized;
};
const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return fallback;
};

const logVehicleMappingJavaSync = ({
  mappingId,
  payload,
  response,
  error,
  status,
  method = "POST",
}) => {
  if (![JAVA_SYNC_STATUS.FAILED, "DELETE_FAILED"].includes(String(status))) {
    return;
  }

  const title = `[VehicleMapping Java Sync] mappingId=${mappingId || "new"} status=${status}`;
  console.groupCollapsed(title);
  console.log("method", method);
  console.log("endpoint", "mapping/vehicle-mapping");
  console.log("payload", payload);

  if (response) {
    console.log("response", response);
  }

  if (error) {
    console.log("error", error);
    console.log("errorResponse", error?.response?.data || null);
  }

  console.groupEnd();
};

export const getVehicleMappingId = (source = {}) =>
  normalizeNumber(source.id ?? source.vehicleDeviceMapId ?? source.mapId ?? 0);

export const buildVehicleMappingJavaPayload = (source = {}) => [
  {
    vehicleId: normalizeString(source.vehicleId ?? source.fk_VehicleId),
    vehicleNo: normalizeString(
      source.vehicleNo ?? source.vehicleNumber ?? source.registrationNo,
    ),
    deviceNo: normalizeString(
      source.deviceNo ?? source.deviceNumber ?? source.deviceSerialNo,
    ),
    imei: normalizeString(
      source.imei ?? source.deviceNo ?? source.deviceNumber ?? source.deviceSerialNo,
    ),
    deviceType: normalizeString(
      source.deviceType ??
        source.deviceTypeName ??
        source.deviceTypeLabel ??
        source.deviceTypeId ??
        source.fk_devicetypeid,
    ),
    deviceTypeId: normalizeNumber(
      source.deviceTypeId ?? source.fk_devicetypeid,
    ),
    deviceTypeName: normalizeString(
      source.deviceType ?? source.deviceTypeName ?? source.deviceTypeLabel,
    ),
    orgName: normalizeString(
      source.orgName ?? source.accountName ?? source.accountLabel,
    ),
    orgId: normalizeNumber(source.orgId ?? source.accountId),
    speedLimit: normalizeNumber(source.speedLimit),
    overspeed: false,
    powerCut: false,
    lowPower: false,
    doorClose: false,
    doorLock: false,
    collision: false,
    geofence: true,
    ac: false,
    ignition: true,
    sos: false,
    fatigue: false,
    gnssFault: false,
    gnssAntennaDisconnect: false,
    gnssAntennaShort: false,
    rollover: false,
    idleStart: false,
    idleStartDurationMin: normalizeNumber(source.idleStartDurationMin),
    idleAc: false,
    idleACDurationMin: normalizeNumber(source.idleACDurationMin),
    towing: false,
  },
];

export const syncVehicleMappingToJava = async (source = {}) => {
  const payload = buildVehicleMappingJavaPayload(source);
  const mappingId = getVehicleMappingId(source);
  const syncKey =
    String(mappingId || "") || JSON.stringify(payload);

  if (inFlightVehicleMappingSyncs.has(syncKey)) {
    return inFlightVehicleMappingSyncs.get(syncKey);
  }

  const syncPromise = (async () => {
    if (mappingId) {
      setDeviceMapSyncStatus(mappingId, {
        status: JAVA_SYNC_STATUS.SYNCING,
        message: "Sync in progress",
      });
    }

    try {
      const res = await javaApi.post("mapping/vehicle-mapping", payload);
      const response = res.data;
      logVehicleMappingJavaSync({
        mappingId,
        payload,
        response: {
          statusCode: res?.status,
          statusText: res?.statusText,
          data: response,
        },
        status: JAVA_SYNC_STATUS.SYNCED,
        method: "POST",
      });

      if (mappingId) {
        setDeviceMapSyncStatus(mappingId, {
          status: JAVA_SYNC_STATUS.SYNCED,
          message: response?.message || "Synced to Java",
          lastSuccessAt: new Date().toISOString(),
        });
      }

      return {
        success: true,
        data: response,
        payload,
      };
    } catch (error) {
      const response = error?.response?.data;
      logVehicleMappingJavaSync({
        mappingId,
        payload,
        response: error?.response
          ? {
              statusCode: error.response.status,
              statusText: error.response.statusText,
              data: response,
            }
          : null,
        error,
        status: JAVA_SYNC_STATUS.FAILED,
        method: "POST",
      });

      if (mappingId) {
        setDeviceMapSyncStatus(mappingId, {
          status: JAVA_SYNC_STATUS.FAILED,
          message: response?.message || "Java sync failed",
          error: response || error?.message || "Java sync failed",
        });
      }

      return {
        success: false,
        data: response,
        error,
        payload,
      };
    } finally {
      inFlightVehicleMappingSyncs.delete(syncKey);
    }
  })();

  inFlightVehicleMappingSyncs.set(syncKey, syncPromise);
  return syncPromise;
};

export const deleteVehicleMappingFromJava = async (source = {}) => {
  const payload = buildVehicleMappingJavaPayload(source);
  const mappingId = getVehicleMappingId(source);

  try {
    const res = await javaApi.delete("mapping/vehicle-mapping", {
      data: payload,
    });
    const response = res.data;

    logVehicleMappingJavaSync({
      mappingId,
      payload,
      response: {
        statusCode: res?.status,
        statusText: res?.statusText,
        data: response,
      },
      status: "DELETED",
      method: "DELETE",
    });

    return {
      success: true,
      data: response,
      payload,
    };
  } catch (error) {
    const response = error?.response?.data;

    logVehicleMappingJavaSync({
      mappingId,
      payload,
      response: error?.response
        ? {
            statusCode: error.response.status,
            statusText: error.response.statusText,
            data: response,
          }
        : null,
      error,
      status: "DELETE_FAILED",
      method: "DELETE",
    });

    return {
      success: false,
      data: response,
      error,
      payload,
    };
  }
};
