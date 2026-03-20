import api from "./apiService";

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

export const saveVehicleGeofence = async (payload) => {
  try {
    const res = await api.post(`/api/vehicle-geofence`, payload);
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
    const res = await api.put(`/api/vehicle-geofence/${id}`, payload);
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
