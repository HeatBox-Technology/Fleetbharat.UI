import api from "./apiService";

export const getPlans = async (page, pageSize, searchQuery) => {
  const skip = Math.max((Number(page || 1) - 1) * Number(pageSize || 10), 0);
  const take = Number(pageSize || 10);
  const res = await api.get(`/api/billing/plans`, {
    params: {
      skip,
      take,
      search: searchQuery || undefined,
    },
  });

  const payload = res?.data || {};
  const rawItems = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.items)
      ? payload.data.items
      : [];

  return {
    ...payload,
    data: {
      items: rawItems,
      totalRecords: Number(
        payload?.data?.totalRecords ??
          payload?.totalRecords ??
          rawItems.length,
      ),
    },
  };
};

export const createPlan = async (payload) => {
  try {
    const res = await api.post(`/api/billing/plans`, payload);
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

export const deletePlan = async (id) => {
  const res = await api.delete(`/api/billing/plans/${id}`);
  return res.data;
};

export const updatePlan = async (id, payload) => {
  try {
    const res = await api.put(`/api/billing/plans/${id}`, payload);
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

export const getById = async (id) => {
  const res = await api.get(`/api/billing/plans/${id}`);
  return res.data;
};

export const getSolutions = async () => {
  const res = await api.get(`/api/solutions`);
  return res.data;
};
