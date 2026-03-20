import api from "./apiService";

export const getAllForms = async (page = 1, pageSize = 10, search = "") => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (search?.trim()) {
    query.append("search", search.trim());
  }

  const res = await api.get(`/api/forms?${query.toString()}`);
  return res.data;
};

export const getFormById = async (id) => {
  const res = await api.get(`/api/forms/${id}`);
  return res.data;
};

export const createForm = async (payload) => {
  try {
    const res = await api.post(`/api/forms`, payload);
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

export const updateForm = async (id, payload) => {
  try {
    const res = await api.put(`/api/forms/${id}`, payload);
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

export const deleteForm = async (id) => {
  try {
    const res = await api.delete(`/api/forms/${id}`);
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
