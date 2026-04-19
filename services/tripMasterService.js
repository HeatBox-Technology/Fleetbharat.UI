import { getStoredAccountId, getStoredUserId } from "@/utils/storage";
import { tmsApi } from "./apiService";

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

const normalizeFrequency = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === "ONE-TIME" || normalized === "ONE_TIME") return "ONE-TIME";
  if (normalized === "RECURRING") return "RECURRING";
  if (normalized === "ONE-TIME" || normalized === "ONE-TIME") return "ONE-TIME";

  const lower = String(value || "")
    .trim()
    .toLowerCase();
  if (lower === "one-time" || lower === "one_time" || lower === "onetime") {
    return "ONE-TIME";
  }
  if (lower === "recurring") return "RECURRING";
  return "";
};

const normalizeRoutingModel = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === "STANDARD") return "STANDARD";
  if (normalized === "DYNAMIC") return "DYNAMIC";
  const lower = String(value || "")
    .trim()
    .toLowerCase();
  if (lower === "standard") return "STANDARD";
  if (lower === "dynamic") return "DYNAMIC";
  return "";
};

const normalizeFleetSource = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === "INTERNAL") return "INTERNAL";
  if (normalized === "EXTERNAL") return "EXTERNAL";
  const lower = String(value || "")
    .trim()
    .toLowerCase();
  if (lower === "master" || lower === "internal") return "INTERNAL";
  if (lower === "adhoc" || lower === "external") return "EXTERNAL";
  return "";
};

const parseTripStartTime = (travelDate, etd, createdDatetime) => {
  if (!travelDate || !etd) return createdDatetime || "";
  const match = String(travelDate).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return createdDatetime || "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${etd}:00`;
};

const toCycleLabel = (tripType) => {
  const normalized = String(tripType || "").toLowerCase();
  if (normalized === "weekly") return "Weekly";
  if (normalized === "monthly") return "Monthly";
  return "One-Off";
};

const mapTripPlan = (item) => {
  const tripType = String(item?.tripType || "").toLowerCase();
  const travelDate = item?.travelDate ?? item?.travel_date ?? null;
  return {
    planId: Number(item?.planId || 0),
    accountId: Number(item?.accountId || 0),
    accountName: String(item?.accountName || ""),
    driverId: Number(item?.driverId || 0),
    driverName: String(item?.driverName || ""),
    vehicleId: Number(item?.vehicleId || 0),
    vehicleNo: String(item?.vehicleNo || ""),
    tripType,
    tripTypeLabel: toCycleLabel(tripType),
    travelDate,
    etd: String(item?.etd || ""),
    leadTime: Number(item?.leadTime || 0),
    eta: Number(item?.eta || 0),
    routeId: Number(item?.routeId || 0),
    routeName: String(item?.routeName || ""),
    startGeoId: Number(item?.startGeoId || 0),
    startGeoName: String(item?.startGeoName || ""),
    endGeoId: Number(item?.endGeoId || 0),
    endGeoName: String(item?.endGeoName || ""),
    createdDatetime: String(item?.createdDatetime || ""),
    isActive: Boolean(item?.isActive ?? true),
    statusLabel: item?.isActive ? "Active" : "Completed",
    startTime: parseTripStartTime(
      travelDate,
      item?.etd,
      item?.createdDatetime,
    ),
  };
};

export const getTripPlans = async ({
  page = 1,
  pageSize = 10,
  accountId,
} = {}) => {
  try {
    const resolvedAccountId = getStoredAccountId(accountId);
    if (resolvedAccountId <= 0) {
      return {
        success: true,
        statusCode: 200,
        message: "Please select account",
        data: {
          summary: { totalRecords: 0, totalActive: 0, totalInactive: 0 },
          trips: { page, pageSize, totalRecords: 0, totalPages: 0, items: [] },
        },
      };
    }

    const res = await tmsApi.get(`/api/trip-plans/all/${resolvedAccountId}`, {
      params: { page, pageSize },
    });

    const payload = res?.data || {};
    const listData = payload?.data || {};
    const rawItems = Array.isArray(listData?.items) ? listData.items : [];
    const items = rawItems.map(mapTripPlan);

    return {
      success: true,
      statusCode: 200,
      message: payload?.message || "Trip plans fetched successfully",
      data: {
        summary: {
          totalRecords: Number(payload?.summary?.totalRecords || 0),
          totalActive: Number(payload?.summary?.totalActive || 0),
          totalInactive: Number(payload?.summary?.totalInactive || 0),
        },
        trips: {
          page: Number(listData?.page || page),
          pageSize: Number(listData?.pageSize || pageSize),
          totalRecords: Number(listData?.totalRecords || items.length),
          totalPages: Number(listData?.totalPages || 1),
          items,
        },
      },
    };
  } catch (error) {
    console.error("API Error in getTripPlans:", error);
    return buildErrorResponse(error, "Failed to fetch trip plans");
  }
};

const buildTripPlanRequestBody = (payload = {}) => {
  const resolvedAccountId = Number(
    payload?.accountId || getStoredAccountId() || 0,
  );

  const fleetSource = normalizeFleetSource(payload?.fleetSource);
  const routingModel = normalizeRoutingModel(payload?.routingModel);
  const frequency = normalizeFrequency(payload?.frequency);

  const secondaryDevice = Array.isArray(payload?.secondaryDevice)
    ? payload.secondaryDevice
        .map((value) => String(value || ""))
        .filter(Boolean)
    : typeof payload?.secondaryDevice === "string" && payload.secondaryDevice
      ? [payload.secondaryDevice]
      : [];

  const routeDetails = Array.isArray(payload?.routeDetails)
    ? payload.routeDetails.map((item, index) => ({
        geofenceId: Number(item?.geofenceId || 0),
        geofenceType: String(item?.geofenceType || ""),
        pointType: String(item?.pointType || ""),
        geofenceAddress: String(item?.geofenceAddress || ""),
        geofenceCenterLatitude: String(item?.geofenceCenterLatitude || ""),
        geofenceCenterLongitude: String(item?.geofenceCenterLongitude || ""),
        geofenceRadius: String(item?.geofenceRadius || ""),
        plannedEntryTime: String(item?.plannedEntryTime || ""),
        plannedExitTime: String(item?.plannedExitTime || ""),
        sequence: Number(item?.sequence || index + 1),
        distance: String(item?.distance ?? "0"),
        googleSuggestedTime: Number(item?.googleSuggestedTime || 0),
        geofenceDetails: Array.isArray(item?.geofenceDetails)
          ? item.geofenceDetails.map((point) => ({
              latitude: String(point?.latitude ?? ""),
              longitude: String(point?.longitude ?? ""),
            }))
          : [],
      }))
    : [];

  return {
    planId: Number(payload?.planId || 0),
    accountId: resolvedAccountId,
    driverId: Number(payload?.driverId || 0),
    driverName: String(payload?.driverName || ""),
    driverPhone: String(payload?.driverPhone || ""),
    fleetSource,
    vehicleId: Number(payload?.vehicleId || 0),
    vehicleNumber: String(payload?.vehicleNumber || payload?.vehicleNo || ""),
    frequency,
    travelDate:
      frequency === "ONE-TIME" ? String(payload?.travelDate || "") : "",
    routingModel,
    routeId: Number(payload?.routeId || 0),
    routePath: String(payload?.routePath || ""),
    startGeoId: Number(payload?.startGeoId || 0),
    endGeoId: Number(payload?.endGeoId || 0),
    createdBy: String(payload?.createdBy || getStoredUserId() || ""),
    weekDays: String(payload?.weekDays || ""),
    isElockTrip: Boolean(payload?.isElockTrip),
    isGPSTrip: Boolean(payload?.isGPSTrip),
    primaryDevice: String(payload?.primaryDevice || ""),
    secondaryDevice,
    vehicleCategory: String(payload?.vehicleCategory || ""),
    consignee: Number(payload?.consignee || 0), // Party account ID
    consignor: Number(payload?.consignor || 0), // Party account ID
    routeDetails,
  };
};

export const createTripPlan = async (payload = {}) => {
  try {
    const requestBody = buildTripPlanRequestBody(payload);
    const res = await tmsApi.post(`/api/trip-plans`, requestBody);
    return res.data;
  } catch (error) {
    console.error("API Error in createTripPlan:", error);
    return buildErrorResponse(error, "Failed to save trip plan");
  }
};

export const updateTripPlan = async (planId, payload = {}) => {
  try {
    const requestBody = buildTripPlanRequestBody({
      ...payload,
      planId: Number(planId || payload?.planId || 0),
    });
    const res = await tmsApi.put(`/api/trip-plans`, requestBody);
    return res.data;
  } catch (error) {
    console.error("API Error in updateTripPlan:", error);
    return buildErrorResponse(error, "Failed to update trip plan");
  }
};

// Backward-compatible helper used by existing callers.
export const upsertTripPlan = async (payload = {}) => {
  const resolvedPlanId = Number(payload?.planId || 0);
  if (resolvedPlanId > 0) {
    console.log("resolvedPlanId", resolvedPlanId);
    return updateTripPlan(resolvedPlanId, payload);
  }
  return createTripPlan(payload);
};

export const deleteTripPlan = async (planId) => {
  try {
    const resolvedPlanId = Number(planId || 0);
    if (resolvedPlanId <= 0) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid trip plan id",
        data: null,
      };
    }

    const res = await tmsApi.delete(`/api/trip-plans/${resolvedPlanId}`);
    return (
      res?.data || {
        success: res?.status >= 200 && res?.status < 300,
        statusCode: res?.status || 200,
        message: "Trip plan deleted successfully",
        data: null,
      }
    );
  } catch (error) {
    console.error("API Error in deleteTripPlan:", error);
    return buildErrorResponse(error, "Failed to delete trip plan");
  }
};

export const getTripPlanById = async (planId, accountId) => {
  try {
    const resolvedPlanId = Number(planId || 0);
    if (resolvedPlanId <= 0) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid trip plan id",
        data: null,
      };
    }

    const res = await tmsApi.get(`/api/trip-plans/${resolvedPlanId}`);
    const payload = res?.data || {};
    const item = payload?.data || null;
    if (!item) {
      return {
        success: false,
        statusCode: 404,
        message: "Trip plan not found",
        data: null,
      };
    }

    const tripType = String(item?.tripType || "").toLowerCase();
    const travelDate = item?.travelDate ?? item?.travel_date ?? null;
    return {
      success: payload?.success ?? true,
      statusCode: Number(payload?.statusCode || 200),
      message: payload?.message || "Trip plan fetched successfully",
      data: {
        planId: Number(item?.planId || 0),
        accountId: Number(item?.accountId || accountId || 0),
        driverId: Number(item?.driverId || 0),
        driverName: String(item?.driverName || ""),
        driverPhone: String(item?.driverPhone || ""),
        vehicleId: Number(item?.vehicleId || 0),
        vehicleNumber: String(item?.vehicleNumber || item?.vehicleNo || ""),
        vehicleNo: String(item?.vehicleNo || ""),
        fleetSource: String(item?.fleetSource || ""),
        routingModel: String(item?.routingModel || ""),
        routePath: String(item?.routePath || ""),
        frequency: item?.frequency ?? null,
        tripType,
        tripTypeLabel: toCycleLabel(tripType),
        travelDate,
        secondaryDevice: Array.isArray(item?.secondaryDevice)
          ? item.secondaryDevice
              .map((value) => String(value || ""))
              .filter(Boolean)
          : typeof item?.secondaryDevice === "string" && item.secondaryDevice
            ? [String(item.secondaryDevice)]
            : [],
        routeId: Number(item?.routeId || 0),
        startGeoId: Number(item?.startGeoId || 0),
        endGeoId: Number(item?.endGeoId || 0),
        weekDays: String(item?.weekDays || ""),
        createdDatetime: String(item?.createdDatetime || ""),
        consignor: Number(item?.consignor || 0), // NEW
        consignee: Number(item?.consignee || 0), // NEW
        routeDetails: Array.isArray(item?.routeDetails)
          ? item.routeDetails.map((detail, index) => ({
              geofenceId: Number(detail?.geofenceId || 0),
              geofenceType: String(detail?.geofenceType || ""),
              pointType: String(detail?.pointType || ""),
              geofenceAddress: String(detail?.geofenceAddress || ""),
              geofenceCenterLatitude: String(
                detail?.geofenceCenterLatitude || "",
              ),
              geofenceCenterLongitude: String(
                detail?.geofenceCenterLongitude || "",
              ),
              geofenceRadius: String(detail?.geofenceRadius || ""),
              plannedEntryTime: String(detail?.plannedEntryTime || ""),
              plannedExitTime: String(detail?.plannedExitTime || ""),
              sequence: Number(detail?.sequence || index + 1),
              distance: String(detail?.distance || "0"),
              googleSuggestedTime: Number(detail?.googleSuggestedTime || 0),
              geofenceDetails: Array.isArray(detail?.geofenceDetails)
                ? detail.geofenceDetails.map((point) => ({
                    latitude: String(point?.latitude ?? ""),
                    longitude: String(point?.longitude ?? ""),
                  }))
                : [],
            }))
          : [],
      },
    };
  } catch (error) {
    console.error("API Error in getTripPlanById:", error);
    return buildErrorResponse(error, "Failed to fetch trip plan");
  }
};

export const getRouteDropdown = async (accountId) => {
  try {
    const resolvedAccountId = getStoredAccountId(accountId);
    if (resolvedAccountId <= 0) {
      return {
        success: true,
        statusCode: 200,
        message: "Please select account",
        data: [],
      };
    }

    const res = await tmsApi.get(`/api/Route/dropdown/${resolvedAccountId}`);
    const payload = res?.data || {};
    const items = Array.isArray(payload?.data)
      ? payload.data.map((item) => ({
          id: Number(item?.id || 0),
          value: String(item?.value || ""),
        }))
      : [];

    return {
      success: payload?.success ?? true,
      statusCode: Number(payload?.statusCode || 200),
      message: payload?.message || "Routes fetched successfully",
      data: items,
    };
  } catch (error) {
    console.error("API Error in getRouteDropdown:", error);
    return buildErrorResponse(error, "Failed to fetch route dropdown");
  }
};
