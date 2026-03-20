import { javaApi } from "./apiService";

const STORAGE_KEY = "geofenceJavaSyncStatus";

export const GEOFENCE_JAVA_SYNC_STATUS = {
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

export const getGeofenceSyncStatusMap = () => readStore();

export const setGeofenceSyncStatus = (geoId, status) => {
  const key = String(geoId || "");
  if (!key) return;

  const store = readStore();
  store[key] = {
    ...store[key],
    ...status,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
};

export const clearGeofenceSyncStatus = (geoId) => {
  const key = String(geoId || "");
  if (!key) return;

  const store = readStore();
  delete store[key];
  writeStore(store);
};

const normalizeNumber = (value) => Number(value || 0);
const normalizeString = (value) => String(value || "").trim();

const normalizeGeoType = (value) => {
  const normalized = normalizeString(value).toUpperCase();
  if (normalized === "POLYGON" || normalized === "CIRCLE") return normalized;
  if (normalized === "POLYGON".toLowerCase()) return "POLYGON";
  if (normalized === "CIRCLE".toLowerCase()) return "CIRCLE";
  return normalized === "POLYGON" ? "POLYGON" : "CIRCLE";
};

const normalizeGeoPoints = (source = {}) => {
  if (Array.isArray(source.geoPoints)) {
    return source.geoPoints.map((point) => ({
      latitude: Number(point?.latitude || point?.lat || 0),
      longitude: Number(point?.longitude || point?.lng || 0),
    }));
  }

  if (Array.isArray(source.coordinates)) {
    return source.coordinates.map((point) => ({
      latitude: Number(point?.latitude || point?.lat || 0),
      longitude: Number(point?.longitude || point?.lng || 0),
    }));
  }

  if (Array.isArray(source.paths)) {
    return source.paths.map((point) => ({
      latitude: Number(point?.latitude || point?.lat || 0),
      longitude: Number(point?.longitude || point?.lng || 0),
    }));
  }

  return [];
};

const getGeoCenter = (source = {}, points = []) => {
  if (source.center) {
    return {
      latitude: Number(source.center?.latitude || source.center?.lat || 0),
      longitude: Number(source.center?.longitude || source.center?.lng || 0),
    };
  }

  const firstPoint = points[0];
  return {
    latitude: Number(firstPoint?.latitude || 0),
    longitude: Number(firstPoint?.longitude || 0),
  };
};

const logGeofenceJavaSync = ({
  geoId,
  payload,
  response,
  error,
  status,
  method = "POST",
}) => {
  if (![GEOFENCE_JAVA_SYNC_STATUS.FAILED, "DELETE_FAILED"].includes(String(status))) {
    return;
  }

  const title = `[Geofence Java Sync] geoId=${geoId || "new"} status=${status}`;
  console.groupCollapsed(title);
  console.log("method", method);
  console.log("endpoint", "mapping/geofence");
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

export const getGeofenceSyncId = (source = {}) =>
  normalizeString(source.geoId ?? source.id ?? source.geofenceId ?? source.zoneId);

export const buildGeofenceJavaPayload = (source = {}) => {
  const geoPoints = normalizeGeoPoints(source);
  const center = getGeoCenter(source, geoPoints);

  return [
    {
      geoId: getGeofenceSyncId(source),
      geoName: normalizeString(
        source.geoName ?? source.displayName ?? source.geofenceName ?? source.name,
      ),
      orgId: normalizeNumber(source.orgId ?? source.accountId),
      orgName: normalizeString(source.orgName ?? source.accountName),
      latitude: Number(center.latitude || 0),
      longitude: Number(center.longitude || 0),
      radius: normalizeNumber(source.radius ?? source.radiusM),
      geoType: normalizeGeoType(source.geoType ?? source.geometryType ?? source.geometry),
      geoPoints,
      vehicleNo: normalizeString(source.vehicleNo),
    },
  ];
};

export const syncGeofenceToJava = async (source = {}) => {
  const payload = buildGeofenceJavaPayload(source);
  const geoId = getGeofenceSyncId(source);

  if (geoId) {
    setGeofenceSyncStatus(geoId, {
      status: GEOFENCE_JAVA_SYNC_STATUS.SYNCING,
      message: "Sync in progress",
    });
  }

  try {
    const res = await javaApi.post("mapping/geofence", payload);
    const response = res.data;

    logGeofenceJavaSync({
      geoId,
      payload,
      response: {
        statusCode: res?.status,
        statusText: res?.statusText,
        data: response,
      },
      status: GEOFENCE_JAVA_SYNC_STATUS.SYNCED,
      method: "POST",
    });

    if (geoId) {
      setGeofenceSyncStatus(geoId, {
        status: GEOFENCE_JAVA_SYNC_STATUS.SYNCED,
        message: response?.message || "Synced to Java",
        lastSuccessAt: new Date().toISOString(),
      });
    }

    return { success: true, data: response, payload };
  } catch (error) {
    const response = error?.response?.data;

    logGeofenceJavaSync({
      geoId,
      payload,
      response: error?.response
        ? {
            statusCode: error.response.status,
            statusText: error.response.statusText,
            data: response,
          }
        : null,
      error,
      status: GEOFENCE_JAVA_SYNC_STATUS.FAILED,
      method: "POST",
    });

    if (geoId) {
      setGeofenceSyncStatus(geoId, {
        status: GEOFENCE_JAVA_SYNC_STATUS.FAILED,
        message: response?.message || "Java sync failed",
        error: response || error?.message || "Java sync failed",
      });
    }

    return { success: false, data: response, error, payload };
  }
};

export const deleteGeofenceFromJava = async (source = {}) => {
  const payload = buildGeofenceJavaPayload(source);
  const geoId = getGeofenceSyncId(source);

  try {
    const res = await javaApi.delete("mapping/geofence", {
      data: payload,
    });
    const response = res.data;

    logGeofenceJavaSync({
      geoId,
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
      request: {
        method: "DELETE",
        endpoint: "mapping/geofence",
        body: payload,
      },
      response: {
        statusCode: res?.status,
        statusText: res?.statusText,
        data: response,
      },
    };
  } catch (error) {
    const response = error?.response?.data;

    logGeofenceJavaSync({
      geoId,
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

    if (geoId) {
      setGeofenceSyncStatus(geoId, {
        status: GEOFENCE_JAVA_SYNC_STATUS.FAILED,
        message: response?.message || "Java delete failed",
      });
    }

    return {
      success: false,
      data: response,
      error,
      payload,
      request: {
        method: "DELETE",
        endpoint: "mapping/geofence",
        body: payload,
      },
      response: error?.response
        ? {
            statusCode: error.response.status,
            statusText: error.response.statusText,
            data: response,
          }
        : null,
    };
  }
};
