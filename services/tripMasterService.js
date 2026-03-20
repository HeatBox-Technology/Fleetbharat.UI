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

const getStoredAccountId = (accountId) => {
  const resolved = Number(accountId || 0);
  if (resolved > 0) return resolved;
  if (typeof window === "undefined") return 0;

  const selectedAccountId = Number(localStorage.getItem("accountId") || 0);
  if (selectedAccountId > 0) return selectedAccountId;

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userAccountId = Number(user?.accountId || user?.AccountId || 0);
    return userAccountId > 0 ? userAccountId : 0;
  } catch {
    return 0;
  }
};

const getStoredUserId = () => {
  if (typeof window === "undefined") return "";
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.userId || user?.UserId || "";
  } catch {
    return "";
  }
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
  return {
    planId: Number(item?.planId || 0),
    accountId: Number(item?.accountId || 0),
    accountName: String(item?.accountName || ""),
    driverId: Number(item?.driverId || 0),
    vehicleId: Number(item?.vehicleId || 0),
    vehicleNo: String(item?.vehicleNo || ""),
    tripType,
    tripTypeLabel: toCycleLabel(tripType),
    travelDate: item?.travelDate || null,
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
      item?.travelDate,
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

const buildTripPlanRequestBody = (payload = {}) => ({
  planId: Number(payload?.planId || 0),
  accountId: Number(payload?.accountId || getStoredAccountId() || 0),
  driverId: Number(payload?.driverId || 0),
  vehicleId: Number(payload?.vehicleId || 0),
  tripType: String(payload?.tripType || "").toLowerCase(),
  travelDate: payload?.travelDate || null,
  etd: String(payload?.etd || ""),
  routeId: Number(payload?.routeId || 0),
  startGeoId: Number(payload?.startGeoId || 0),
  endGeoId: Number(payload?.endGeoId || 0),
  createdBy: payload?.createdBy || getStoredUserId(),
  weekDays: String(payload?.weekDays || ""),
  routeDetails: Array.isArray(payload?.routeDetails)
    ? payload.routeDetails.map((item, index) => ({
        fromGeoId: Number(item?.fromGeoId || 0),
        toGeoId: Number(item?.toGeoId || 0),
        sequence: Number(item?.sequence || index + 1),
        distance: String(item?.distance || "0"),
        leadTime: Number(item?.leadTime || 0),
        rta: Number(item?.rta || 0),
      }))
    : [],
});

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
    console.log("resolvedPlanId",resolvedPlanId)
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
    return {
      success: payload?.success ?? true,
      statusCode: Number(payload?.statusCode || 200),
      message: payload?.message || "Trip plan fetched successfully",
      data: {
        planId: Number(item?.planId || 0),
        accountId: Number(item?.accountId || accountId || 0),
        driverId: Number(item?.driverId || 0),
        vehicleId: Number(item?.vehicleId || 0),
        tripType,
        tripTypeLabel: toCycleLabel(tripType),
        travelDate: item?.travelDate || null,
        etd: String(item?.etd || ""),
        leadTime: Number(item?.leadTime || 0),
        eta: Number(item?.eta || 0),
        routeId: Number(item?.routeId || 0),
        startGeoId: Number(item?.startGeoId || 0),
        endGeoId: Number(item?.endGeoId || 0),
        weekDays: String(item?.weekDays || ""),
        createdDatetime: String(item?.createdDatetime || ""),
        routeDetails: Array.isArray(item?.routeDetails)
          ? item.routeDetails.map((detail, index) => ({
              fromGeoId: Number(detail?.fromGeoId || 0),
              toGeoId: Number(detail?.toGeoId || 0),
              sequence: Number(detail?.sequence || index + 1),
              distance: String(detail?.distance || "0"),
              leadTime: Number(detail?.leadTime || 0),
              rta: Number(detail?.rta || 0),
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
