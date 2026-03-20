import api from "./apiService";

const buildManufacturerPayload = (payload = {}, options = {}) => {
  const { id = 0, includeCreatedAt = false, useNowIfCreatedAtMissing = false } =
    options;

  const requestPayload = {
    id,
    code: payload.code ?? "",
    displayName: payload.displayName ?? "",
    officialWebsite: payload.officialWebsite ?? "",
    originCountry: payload.originCountry ?? "",
    supportEmail: payload.supportEmail ?? "",
    supportHotline: payload.supportHotline ?? "",
    description: payload.description ?? "",
    isEnabled: Boolean(payload.isEnabled),
  };

  if (includeCreatedAt) {
    if (payload.createdAt) {
      requestPayload.createdAt = payload.createdAt;
    } else if (useNowIfCreatedAtMissing) {
      requestPayload.createdAt = new Date().toISOString();
    }
  }

  return requestPayload;
};

export const getOemManufacturers = async (page, pageSize, search = "") => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search: String(search ?? "").trim(),
    });

    const res = await api.get(`/api/oem-manufacturers/list?${params.toString()}`);
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

export const getOemManufactureById = async (id) => {
  try {
    const res = await api.get(`/api/oem-manufacturers/${id}`);
    const response = res.data || {};

    const manufacturer =
      response?.data?.manufacturer ||
      response?.data?.item ||
      response?.data ||
      response?.manufacturer ||
      response;

    return {
      ...response,
      data: manufacturer,
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

export const postOemManufacture = async (payload) => {
  try {
    const requestPayload = buildManufacturerPayload(payload, {
      id: 0,
      includeCreatedAt: true,
      useNowIfCreatedAtMissing: true,
    });
    const res = await api.post(`/api/oem-manufacturers`, requestPayload);
    return res.data;
  } catch (error) {
    console.error("API Error in postOemManufacture:", error);
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

export const updateOemManufacture = async (id, payload) => {
  try {
    const requestPayload = buildManufacturerPayload(payload, {
      id: 0,
      includeCreatedAt: true,
      useNowIfCreatedAtMissing: false,
    });
    const res = await api.put(`/api/oem-manufacturers/${id}`, requestPayload);
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

export const updateOemManufactureStatus = async (id, isEnabled) => {
  try {
    const res = await api.patch(
      `/api/oem-manufacturers/${id}/status?isEnabled=${Boolean(isEnabled)}`,
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

export const deleteOemManufacture = async (id) => {
  try {
    const res = await api.delete(`/api/oem-manufacturers/${id}`);
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
