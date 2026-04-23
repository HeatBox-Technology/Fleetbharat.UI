import api from "./apiService";

const buildErrorResponse = (error, fallbackMessage = "Network or server error") =>
  error.response?.data || {
    success: false,
    statusCode: error.response?.status || 500,
    message: error.response?.data?.message || fallbackMessage,
    data: null,
  };


const buildDeviceModelPayload = (payload = {}) => ({
  code: String(payload.code || "").trim(),
  displayName: String(payload.displayName || "").trim(),
  description: String(payload.description || "").trim(),
  manufacturerId: Number(payload.manufacturerId || 0),
  deviceCategoryId: Number(payload.deviceCategoryId || 0),
  protocolType: String(payload.protocolType || "").trim(),
  isEnabled: payload.isEnabled === undefined ? true : Boolean(payload.isEnabled),
});


export const getDeviceModels = async (page = 1, pageSize = 10, search = "") => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search: String(search ?? "").trim(),
    });
    const res = await api.get(`/api/device-models/list?${params.toString()}`);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};


export const getDeviceModelById = async (id) => {
  try {
    const res = await api.get(`/api/device-models/${id}`);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};


export const postDeviceModel = async (payload) => {
  try {
    const requestPayload = buildDeviceModelPayload(payload);
    const res = await api.post(`/api/device-models`, requestPayload);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const updateDeviceModel = async (id, payload) => {
  try {
    const requestPayload = buildDeviceModelPayload(payload);
    const res = await api.put(`/api/device-models/${id}`, requestPayload);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};


export const updateDeviceModelStatus = async (id, isEnabled) => {
  try {
    const res = await api.patch(
      `/api/device-models/${id}/status?isEnabled=${Boolean(isEnabled)}`
    );
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};


export const deleteDeviceModel = async (id) => {
  try {
    const res = await api.delete(`/api/device-models/${id}`);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};


export const getOemManufacturersLookup = async () => {
  try {
    const res = await api.get(`/api/Lookup/oem-manufacturers`);
    // Lookup APIs often return a raw array or a wrapped object; 
    // adjusting based on your provided JSON response format
    const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
    return {
      success: true,
      data: data.map(item => ({ id: item.id, name: item.name }))
    };
  } catch (error) {
    return { ...buildErrorResponse(error), data: [] };
  }
};


export const getDeviceCategoriesLookup = async () => {
  try {
    const res = await api.get(`/api/Lookup/device-types`);
    const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
    return {
      success: true,
      data: data.map(item => ({ id: item.id, name: item.name }))
    };
  } catch (error) {
    return { ...buildErrorResponse(error), data: [] };
  }
};