import api from "./apiService";

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

const buildNetworkProviderPayload = (payload = {}) => ({
  code: String(payload.code || "").trim(),
  displayName: String(payload.displayName || "").trim(),
  description: String(payload.description || "").trim(),
  isEnabled: payload.isEnabled === undefined ? true : Boolean(payload.isEnabled),
});

export const getNetworkProviders = async (
  page = 1,
  pageSize = 10,
  search = "",
) => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search: String(search ?? "").trim(),
    });
    const res = await api.get(
      `/api/network-providers/list?${params.toString()}`,
    );
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const getNetworkProviderById = async (id) => {
  try {
    const res = await api.get(`/api/network-providers/${id}`);
    const response = res.data || {};
    const provider =
      response?.data?.provider ||
      response?.data?.item ||
      response?.data ||
      response?.provider ||
      response;

    return {
      ...response,
      data: provider,
    };
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const postNetworkProvider = async (payload) => {
  try {
    const requestPayload = buildNetworkProviderPayload(payload);
    const res = await api.post(`/api/network-providers`, requestPayload);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const updateNetworkProvider = async (id, payload) => {
  try {
    const requestPayload = buildNetworkProviderPayload(payload);
    const res = await api.put(`/api/network-providers/${id}`, requestPayload);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const updateNetworkProviderStatus = async (id, isEnabled) => {
  try {
    const res = await api.patch(
      `/api/network-providers/${id}/status?isEnabled=${Boolean(isEnabled)}`,
    );
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const deleteNetworkProvider = async (id) => {
  try {
    const res = await api.delete(`/api/network-providers/${id}`);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const getNetworkProviderDropdown = async () => {
  try {
    const res = await api.get(`/api/Lookup/network-providers`);
    const response = res.data || {};
    const rows = Array.isArray(response?.data) ? response.data : [];

    return {
      ...response,
      statusCode: Number(response?.statusCode || res.status || 200),
      data: rows
        .map((item) => ({
          id: Number(item?.id || 0),
          name: String(item?.name || "").trim(),
        }))
        .filter((item) => item.id > 0 && item.name),
    };
  } catch (error) {
    return {
      ...buildErrorResponse(error),
      data: [],
    };
  }
};
