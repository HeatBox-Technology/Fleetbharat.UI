import api from "./apiService";
import { getStoredUserData } from "@/utils/storage";

/**
 * @param {{ page?: number; pageSize?: number; accountId?: number; search?: string }} options
 */
export const getVehicleGeofences = async ({
  page = 1,
  pageSize = 10,
  accountId,
  search = "",
} = {}) => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (accountId !== undefined && accountId !== null && Number(accountId) > 0) {
    query.set("accountId", String(accountId));
  }

  if (typeof search === "string" && search.trim()) {
    query.set("search", search.trim());
  }

  const res = await api.get(`/api/vehicle-geofence/list?${query.toString()}`);
  return res.data;
};

export const getVehicleGeofenceById = async (id) => {
  const res = await api.get(`/api/vehicle-geofence/${id}`);
  return res.data;
};

/**
 * Build payload for creation with user data
 * Automatically includes createdBy (accountId) and createdByUserId
 */
const buildCreatePayload = (payload) => {
  const { accountId: storedAccountId, userId: storedUserId } = getStoredUserData();

  return {
    accountId: Number(payload?.accountId || storedAccountId || 0),
    vehicleIds: Array.isArray(payload?.vehicleIds) ? payload.vehicleIds : [],
    geofenceIds: Array.isArray(payload?.geofenceIds) ? payload.geofenceIds : [],
    remarks: String(payload?.remarks || ""),
    createdBy: Number(payload?.createdBy || storedAccountId || 0),
    createdByUserId: String(payload?.createdByUserId || storedUserId || ""),
  };
};

/**
 * Build payload for update with user data
 * Automatically includes updatedBy (accountId) and updatedByUserId
 */
const buildUpdatePayload = (payload) => {
  const { accountId: storedAccountId, userId: storedUserId } = getStoredUserData();

  const built = {
    vehicleIds: Array.isArray(payload?.vehicleIds) ? payload.vehicleIds : [],
    geofenceIds: Array.isArray(payload?.geofenceIds) ? payload.geofenceIds : [],
    remarks: String(payload?.remarks || ""),
    updatedBy: Number(payload?.updatedBy || storedAccountId || 0),
    updatedByUserId: String(payload?.updatedByUserId || storedUserId || ""),
  };

  // Include isActive if it exists in payload
  if (payload?.hasOwnProperty("isActive")) {
    built.isActive = Boolean(payload.isActive);
  }

  return built;
};

export const saveVehicleGeofence = async (payload) => {
  try {
    const builtPayload = buildCreatePayload(payload);
    const res = await api.post(`/api/vehicle-geofence`, builtPayload);
    return res.data;
  } catch (error) {
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || "Network or server error",
        data: null,
      }
    );
  }
};

export const updateVehicleGeofence = async (id, payload) => {
  try {
    const builtPayload = buildUpdatePayload(payload);
    const res = await api.put(`/api/vehicle-geofence/${id}`, builtPayload);
    return res.data;
  } catch (error) {
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || "Network or server error",
        data: null,
      }
    );
  }
};

export const deleteVehicleGeofence = async (id) => {
  try {
    const res = await api.delete(`/api/vehicle-geofence/${id}`);
    return res.data;
  } catch (error) {
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || "Network or server error",
        data: null,
      }
    );
  }
};
