import { tmsApi } from "./apiService";

function getStoredUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    console.log(user);
    const userId = user?.userId || "";
    return userId;
  } catch {
    return "";
  }
}

const buildErrorResponse = (
  error,
  fallbackMessage = "Network or server error",
) =>
  error.response?.data || {
    success: false,
    statusCode: error.response?.status || 500,
    message: error.response?.data?.message || fallbackMessage,
    data: null,
  };

/**
 * @param {{ page?: number; pageSize?: number; accountId?: number }} options
 */
export const getRouteMasters = async ({
  page = 1,
  pageSize = 10,
  accountId,
} = {}) => {
  try {
    const resolvedAccountId = Number(accountId || 0);
    if (resolvedAccountId <= 0) {
      return {
        success: true,
        statusCode: 200,
        message: "Please select account",
        data: {
          summary: {
            totalRoutes: 0,
            totalActiveRoutes: 0,
            totalInactiveRoutes: 0,
          },
          routes: { page, pageSize, totalRecords: 0, totalPages: 0, items: [] },
        },
      };
    }

    const res = await tmsApi.get(`/api/Route/all/${resolvedAccountId}`, {
      params: { page, pageSize },
    });

    const payload = res?.data || {};
    const rootData = payload?.data || payload;
    const summaryData = rootData?.summary || payload?.summary || {};
    const assignmentData = rootData?.assignments || payload?.assignments || {};
    const rawItems = Array.isArray(assignmentData?.items)
      ? assignmentData.items
      : [];

    const normalizedItems = rawItems.map((item) => ({
      id: Number(item?.routeId || 0),
      routeName: String(item?.routeName || ""),
      accountName: String(item?.accountName || "-"),
      startPointName: String(item?.startGeoName || "-"),
      endPointName: String(item?.endGeoName || "-"),
      routePath: String(item?.routePath || ""),
      stopsCount: Number(item?.stopCount || 0),
      isGeofenceRelated: true,
      isActive: true,
      createdAt: String(item?.createdAt || ""),
    }));

    return {
      success: true,
      statusCode: 200,
      message: payload?.message || "Route masters fetched successfully",
      data: {
        summary: {
          totalRoutes: Number(summaryData?.totalRoutes || 0),
          totalActiveRoutes: Number(summaryData?.totalActiveRoutes || 0),
          totalInactiveRoutes: Number(summaryData?.totalInactiveRoutes || 0),
        },
        routes: {
          page: Number(assignmentData?.page || page),
          pageSize: Number(assignmentData?.pageSize || pageSize),
          totalRecords: Number(assignmentData?.totalRecords || 0),
          totalPages: Number(assignmentData?.totalPages || 0),
          items: normalizedItems,
        },
      },
    };
  } catch (error) {
    console.error("API Error in getRouteMasters:", error);
    return buildErrorResponse(error, "Failed to fetch route masters");
  }
};

export const getRouteMasterById = async (id) => {
  try {
    const res = await tmsApi.get(`/api/Route/${id}`);
    const payload = res?.data || {};
    const rootData = payload?.data || payload;
    const route = rootData?.route || rootData?.item || rootData;

    const stopDetails = Array.isArray(route?.stopDetails)
      ? route.stopDetails
      : [];
    const stopGeofenceIds = stopDetails
      .map((item) => Number(item?.toGeoId || 0))
      .filter((geoId) => geoId > 0 && geoId !== Number(route?.endGeoId || 0));

    return {
      success: true,
      statusCode: 200,
      message: payload?.message || "Route fetched successfully",
      data: {
        routeId: Number(route?.routeId || id || 0),
        routeName: String(route?.routeName || ""),
        /**
         * Encoded polyline string (Google Maps format) saved at create/update time.
         * Use google.maps.geometry.encoding.decodePath(routePath) on the client
         * to reconstruct the full route polyline on the map.
         */
        routePath: String(route?.routePath || ""),
        routeType: String(route?.routeType || "fixed"),
        accountId: Number(route?.accountId || 0),
        startGeoId: Number(route?.startGeoId || 0),
        endGeoId: Number(route?.endGeoId || 0),
        startGeofenceId: Number(route?.startGeoId || 0),
        endGeofenceId: Number(route?.endGeoId || 0),
        startGeoName: String(route?.startGeoName || ""),
        endGeoName: String(route?.endGeoName || ""),
        /** Total route distance in metres (stored as string) */
        totalDistance: String(route?.totalDistance || "0"),
        /** Total route duration in seconds (stored as string) */
        totalTime: String(route?.totalTime || "0"),
        stopGeofenceIds,
        /** Per-segment metrics – distance in metres & time in seconds (strings) */
        stopDetails: stopDetails.map((item) => ({
          sequence: Number(item?.sequence || 0),
          fromGeoId: Number(item?.fromGeoId || 0),
          toGeoId: Number(item?.toGeoId || 0),
          distance: String(item?.distance || "0"),
          time: String(item?.time || "0"),
        })),
        isGeofenceRelated: true,
        isActive: Boolean(route?.isActive ?? true),
        createdBy: route?.createdBy || "",
      },
    };
  } catch (error) {
    console.error("API Error in getRouteMasterById:", error);
    return buildErrorResponse(error, "Failed to fetch route master");
  }
};

/**
 * Builds the stopDetails array.
 * segmentMetrics comes from Google Maps DirectionsResult legs:
 *   [ { distanceMetres: number, durationSeconds: number }, ... ]
 * One entry per leg, in the same order as the legs array.
 */
const buildStopDetails = (
  startGeoId,
  endGeoId,
  stopGeofenceIds,
  segmentMetrics = [],
) => {
  const stopIds = Array.isArray(stopGeofenceIds)
    ? stopGeofenceIds.map((id) => Number(id)).filter((id) => id > 0)
    : [];

  const path = [
    Number(startGeoId || 0),
    ...stopIds,
    Number(endGeoId || 0),
  ].filter((id) => id > 0);

  if (path.length < 2) return [];

  return path.slice(0, -1).map((fromGeoId, index) => ({
    sequence: index + 1,
    fromGeoId,
    toGeoId: path[index + 1],
    distance: String(segmentMetrics[index]?.distanceMetres ?? 0),
    time: String(segmentMetrics[index]?.durationSeconds ?? 0),
  }));
};

/**
 * Save a new route.
 *
 * Extra fields expected in payload (populated by page.tsx after calculateRoute):
 *   routePath        {string}  – Google Maps encoded polyline
 *   totalDistance    {string}  – Total metres (sum of all legs)
 *   totalTime        {string}  – Total seconds (sum of all legs)
 *   segmentMetrics   {Array}   – [{ distanceMetres, durationSeconds }] per leg
 */
export const saveRouteMaster = async (payload) => {
  try {
    if (!String(payload?.routePath || "").trim()) {
      return {
        success: false,
        statusCode: 400,
        message:
          "Route path is required. Please generate route from Google Maps before saving.",
        data: null,
      };
    }

    const requestBody = {
      routeId: 0,
      routeName: String(payload?.routeName || ""),
      routePath: String(payload?.routePath || ""),
      routeType: payload?.isGeofenceRelated === false ? "dynamic" : "fixed",
      accountId: Number(payload?.accountId || 0),
      startGeoId: Number(payload?.startGeofenceId || 0),
      endGeoId: Number(payload?.endGeofenceId || 0),
      totalDistance: String(payload?.totalDistance || "0"),
      totalTime: String(payload?.totalTime || "0"),
      isActive: Boolean(payload?.isActive ?? true),
      stopDetails: buildStopDetails(
        payload?.startGeofenceId,
        payload?.endGeofenceId,
        payload?.stopGeofenceIds,
        payload?.segmentMetrics,
      ),
      createdBy: getStoredUserId(),
    };

    const res = await tmsApi.post(`/api/Route`, requestBody);
    return (
      res?.data || {
        success: res?.status >= 200 && res?.status < 300,
        statusCode: res?.status || 200,
        message: "Route saved successfully",
        data: null,
      }
    );
  } catch (error) {
    console.error("API Error in saveRouteMaster:", error);
    return buildErrorResponse(error, "Failed to save route master");
  }
};

/**
 * Update an existing route.
 * Same extra fields as saveRouteMaster.
 */
export const updateRouteMaster = async (id, payload) => {
  try {
    if (!String(payload?.routePath || "").trim()) {
      return {
        success: false,
        statusCode: 400,
        message:
          "Route path is required. Please generate route from Google Maps before updating.",
        data: null,
      };
    }

    const requestBody = {
      routeId: Number(id || payload?.routeId || 0),
      routeName: String(payload?.routeName || ""),
      routePath: String(payload?.routePath || ""),
      routeType: payload?.isGeofenceRelated === false ? "dynamic" : "fixed",
      accountId: Number(payload?.accountId || 0),
      startGeoId: Number(payload?.startGeofenceId || 0),
      endGeoId: Number(payload?.endGeofenceId || 0),
      totalDistance: String(payload?.totalDistance || "0"),
      totalTime: String(payload?.totalTime || "0"),
      isActive: Boolean(payload?.isActive ?? true),
      stopDetails: buildStopDetails(
        payload?.startGeofenceId,
        payload?.endGeofenceId,
        payload?.stopGeofenceIds,
        payload?.segmentMetrics,
      ),
      createdBy: getStoredUserId(),
    };

    const res = await tmsApi.post(`/api/Route`, requestBody);
    return res.data;
  } catch (error) {
    console.error("API Error in updateRouteMaster:", error);
    return buildErrorResponse(error, "Failed to update route master");
  }
};

export const deleteRouteMaster = async (id) => {
  try {
    const res = await tmsApi.delete(`/api/Route/${id}`);
    return res.data;
  } catch (error) {
    console.error("API Error in deleteRouteMaster:", error);
    return buildErrorResponse(error, "Failed to delete route master");
  }
};
