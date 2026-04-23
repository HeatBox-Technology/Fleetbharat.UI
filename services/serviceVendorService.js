import api from "./apiService";

const buildErrorResponse = (error) =>
  error.response?.data || {
    success: false,
    statusCode: error.response?.status || 500,
    message: error.response?.data?.message || "Network error",
    data: null,
  };

export const getServiceVendors = async (page = 1, pageSize = 10, search = "") => {
  try {
    const params = new URLSearchParams({ page, pageSize, search: search.trim() });
    const res = await api.get(`/api/service-vendors/list?${params.toString()}`);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const getServiceVendorById = async (id) => {
  try {
    const res = await api.get(`/api/service-vendors/${id}`);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const postServiceVendor = async (payload) => {
  try {
    const res = await api.post(`/api/service-vendors`, payload);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const updateServiceVendor = async (id, payload) => {
  try {
    const res = await api.put(`/api/service-vendors/${id}`, payload);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const updateServiceVendorStatus = async (id, isEnabled) => {
  try {
    const res = await api.patch(`/api/service-vendors/${id}/status?isEnabled=${isEnabled}`);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const deleteServiceVendor = async (id) => {
  try {
    const res = await api.delete(`/api/service-vendors/${id}`);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};