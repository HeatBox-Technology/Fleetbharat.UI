import api from "./apiService";

// ✅ Get Categories (List)
export const getCategories = async (page = 1, pageSize = 10, search = "") => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search?.trim()) {
    query.set("search", search.trim());
  }
  const res = await api.get(`/api/categories?${query.toString()}`);
  return res.data;
};

// ✅ Get Category By ID
export const getCategoryById = async (id) => {
  const res = await api.get(`/api/categories/${id}`);
  return res.data;
};

// ✅ Save Category
export const saveCategory = async (payload) => {
  try {
    const res = await api.post(`/api/categories`, payload);
    return res.data;
  } catch (error) {
    console.error("API Error in saveCategory:", error);

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

// ✅ Update Category
export const updateCategory = async (payload, id) => {
  try {
    const res = await api.put(`/api/categories/${id}`, payload);
    return res.data;
  } catch (error) {
    console.error("API Error in updateCategory:", error);

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

// ✅ Delete Category
export const deleteCategory = async (id) => {
  try {
    const res = await api.delete(`/api/categories/${id}`);
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

// ✅ Update Category Status (PATCH)
export const updateCategoryStatus = async (id, isActive) => {
  try {
    const res = await api.patch(
      `/api/categories/${id}/status?isActive=${isActive}`,
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
