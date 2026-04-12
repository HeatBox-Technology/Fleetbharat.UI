import api from "./apiService";

export const getRoles = async (page, pageSize, searchQuery) => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (searchQuery?.trim()) {
    query.set("search", searchQuery.trim());
  }
  const res = await api.get(`/api/roles/GetAllRole?${query.toString()}`);
  return res.data;
};

export const createRole = async (payload) => {
  try {
    const res = await api.post(`/api/roles`, payload);
    return res.data;
  } catch (error) {
    console.error("API Error in save:", error);

    // Handle different error response structures safely
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

export const getRoleById = async (id, accountId) => {
  const res = await api.get(`/api/roles/${id}?accountId=${accountId}`);
  return res.data;
};

export const updateRole = async (id, payload) => {
  try {
    const res = await api.put(`/api/roles/${id}`, payload);
    return res.data;
  } catch (error) {
    console.error("API Error in save:", error);

    // Handle different error response structures safely
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

export const updateRights = async (id, payload) => {
  try {
    const res = await api.put(`/api/roles/${id}/rights`, payload);
    return res.data;
  } catch (error) {
    console.error("API Error in save:", error);

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

export const deleteRole = async (id) => {
  const res = await api.delete(`/api/roles/${id}`);
  return res.data;
};

export const exportRoles = async (accountId, search, format = "csv") => {
  try {
    const res = await api.get(`/api/roles/export`, {
      params: { 
        accountId, 
        search,
        format: format && ["excel", "csv"].includes(format) ? format : "csv",
      },
      responseType: "blob", // for file download
      headers: { Accept: "*/*" },
    });

    // Convert blob to downloadable file
    const blob = new Blob([res.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roles_export_${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return {
      success: true,
      statusCode: 200,
      message: "Roles exported successfully",
      data: null,
    };
  } catch (error) {
    console.error("API Error in exportRoles:", error);

    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message:
          error.response?.data?.message ||
          "Failed to export roles. Network or server error.",
        data: null,
      }
    );
  }
};
