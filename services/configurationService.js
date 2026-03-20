import api from "./apiService";

// ✅ Get Configurations (List with pagination)
export const getConfigurations = async (page = 1, pageSize = 10, search = "") => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search?.trim()) {
    query.set("search", search.trim());
  }
  const res = await api.get(`/api/account-configurations?${query.toString()}`);
  return res.data;
};

// ✅ Get Configuration By ID
export const getConfigurationById = async (id) => {
  const res = await api.get(`/api/account-configurations/${id}`);
  return res.data;
};

// ✅ Save Configuration
export const saveConfiguration = async (payload) => {
  try {
    const res = await api.post(`/api/account-configurations`, payload);
    return res.data;
  } catch (error) {
    console.error("API Error in saveConfiguration:", error);

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

// ✅ Update Configuration
export const updateConfiguration = async (payload, id) => {
  try {
    const res = await api.put(`/api/account-configurations/${id}`, payload);
    return res.data;
  } catch (error) {
    console.error("API Error in updateConfiguration:", error);

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

// ✅ Delete Configuration
export const deleteConfiguration = async (id) => {
  try {
    const res = await api.delete(`/api/account-configurations/${id}`);
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

// ✅ Update Configuration Status (PATCH)
export const updateConfigurationStatus = async (id, isActive) => {
  try {
    const res = await api.put(`/api/account-configurations/${id}`, {
      isActive,
    });
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
