import api from "./apiService";

export const getSubscriptions = async (page, pageSize, searchQuery) => {
  const skip = Math.max((Number(page || 1) - 1) * Number(pageSize || 10), 0);
  const take = Number(pageSize || 10);

  const res = await api.get(`/api/billing/subscriptions`, {
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
        payload?.data?.totalRecords ?? payload?.totalRecords ?? rawItems.length,
      ),
    },
  };
};

export const mapPlanToSubscription = async (payload) => {
  try {
    const res = await api.post(`/api/billing/subscriptions/map-plan`, payload);
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
