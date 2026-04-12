// src/features/auth/authService.js
import api from "./apiService";

export const getVehicles = async (
  page,
  pageSize,
  search = "",
  accountId,
) => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const resolvedAccountId = Number(accountId || 0);
  if (resolvedAccountId > 0) {
    query.set("accountId", String(resolvedAccountId));
  }

  if (search?.trim()) {
    query.set("search", search.trim());
  }
  const res = await api.get(`/api/vehicles?${query.toString()}`);
  return res.data;
};

export const getVehicleType = async () => {
  const res = await api.get(`/api/VehicleType`);
  return res.data;
};

export const getLeasedVendors = async () => {
  const res = await api.get(`/api/Lookup/leased-vendors`);
  return res.data;
};

export const getVehicleBrands = async () => {
  const res = await api.get(`/api/Lookup/vehicle-brand-oems`);
  return res.data;
};

export const saveVehicle = async (payload) => {
  try {
    const res = await api.post(`/api/vehicles`, payload);
    return res.data;
  } catch (error) {
    console.error("API Error in saveCategory:", error);

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

export const getVehicleById = async (id) => {
  const res = await api.get(`/api/vehicles/${id}`);
  return res.data;
};

export const updateVehicle = async (id, payload) => {
  try {
    const res = await api.put(`/api/vehicles/${id}`, payload);
    return res.data;
  } catch (error) {
    console.error("API Error in update Vehicle:", error);

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

export const deleteVehicle = async (id) => {
  try {
    const res = await api.delete(`/api/vehicles/${id}`);
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

export const exportVehicles = async (accountId, search, format = "csv") => {
  try {
    const query = new URLSearchParams();
    const resolvedAccountId = Number(accountId || 0);
    if (resolvedAccountId > 0) {
      query.set("accountId", String(resolvedAccountId));
    }
    if (String(search || "").trim()) {
      query.set("search", String(search).trim());
    }
    if (format && ["excel", "csv"].includes(format)) {
      query.set("format", format);
    }

    const queryString = query.toString();
    const res = await api.get(
      `/api/vehicles/export${queryString ? `?${queryString}` : ""}`,
      {
      responseType: "blob",
      headers: { Accept: "*/*" },
      },
    );

    const contentType = res.headers?.["content-type"] || "text/csv";
    const blob = new Blob([res.data], { type: contentType });
    const contentDisposition = res.headers?.["content-disposition"] || "";
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const ext = format === "excel" ? "xlsx" : "csv";
    const fileName =
      fileNameMatch?.[1] ||
      `vehicles_export_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      statusCode: 200,
      message: "Vehicles exported successfully",
      data: null,
    };
  } catch (error) {
    console.error("API Error in exportVehicles:", error);
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message:
          error.response?.data?.message ||
          "Failed to export vehicles. Network or server error.",
        data: null,
      }
    );
  }
};
