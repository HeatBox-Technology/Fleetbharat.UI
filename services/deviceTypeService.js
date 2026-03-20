import api from "./apiService";

const normalizeDeviceTypeCreatePayload = (payload = {}) => ({
  code: String(payload.code || "").trim(),
  oemmanufacturerId: Number(payload.oemmanufacturerId || 0),
  name: String(payload.name || "").trim(),
  description: String(payload.description || "").trim(),
  createdBy: Number(payload.createdBy || 0),
});

const buildDeviceTypeCreateRequestPayload = (payload = {}) =>
  normalizeDeviceTypeCreatePayload(payload);

const buildDeviceTypeUpdatePayload = (payload = {}) => ({
  id: 0,
  oemmanufacturerId: Number(payload.oemmanufacturerId || 0),
  code: String(payload.code || "").trim(),
  name: String(payload.name || "").trim(),
  description: String(payload.description || "").trim(),
  isEnabled: Boolean(payload.isEnabled),
  isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
  updatedBy: Number(payload.updatedBy || 0),
});

export const getDeviceTypes = async (page, pageSize, search = "") => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search: String(search ?? "").trim(),
    });
    const res = await api.get(`/api/device-types/list?${params.toString()}`);
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

export const getDeviceTypeById = async (id) => {
  try {
    const res = await api.get(`/api/device-types/${id}`);
    const response = res.data || {};
    const deviceType =
      response?.data?.deviceType ||
      response?.data?.item ||
      response?.data ||
      response?.deviceType ||
      response;

    return {
      ...response,
      data: deviceType,
    };
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

export const postDeviceType = async (payload) => {
  try {
    const requestPayload = buildDeviceTypeCreateRequestPayload(payload);
    const res = await api.post(`/api/device-types`, requestPayload);
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

export const updateDeviceType = async (id, payload) => {
  try {
    const requestPayload = buildDeviceTypeUpdatePayload(payload);
    const res = await api.put(`/api/device-types/${id}`, requestPayload);
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

export const deleteDeviceType = async (id) => {
  try {
    const res = await api.delete(`/api/device-types/${id}`);
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

export const updateDeviceTypeStatus = async (id, isEnabled) => {
  try {
    const res = await api.patch(
      `/api/device-types/${id}/status?isEnabled=${Boolean(isEnabled)}`,
    );
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
