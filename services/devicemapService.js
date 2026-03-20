import api from "./apiService";

export const getDeviceMaps = async ({
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

  const res = await api.get(
    `/api/vehicle-device-maps/list?${query.toString()}`,
  );
  return res.data;
};

export const getDeviceMapById = async (id) => {
  const res = await api.get(`/api/vehicle-device-maps/${id}`);
  return res.data;
};

export const getAllVehicleDeviceMaps = async (page = 1, pageSize = 10) =>
  getDeviceMaps({ page, pageSize });

export const getVehicleDeviceMapById = async (id) => getDeviceMapById(id);

export const saveDeviceMap = async (payload) => {
  try {
    const res = await api.post(`/api/vehicle-device-maps`, payload);
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

export const updateDeviceMap = async (id, payload) => {
  try {
    const res = await api.put(`/api/vehicle-device-maps/${id}`, payload);
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

export const deleteDeviceMap = async (id) => {
  try {
    const res = await api.delete(`/api/vehicle-device-maps/${id}`);
    return (
      res.data || {
        success: true,
        statusCode: res.status,
        message: "Device mapping deleted successfully.",
        data: null,
      }
    );
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
