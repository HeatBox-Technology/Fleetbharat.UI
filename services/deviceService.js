import api from "./apiService";

const getStoredUser = () => {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    return {};
  }
};

const getStoredAccountId = () => {
  if (typeof window === "undefined") return 0;

  const user = getStoredUser();
  const selectedAccountId = Number(localStorage.getItem("accountId") || 0);
  if (selectedAccountId > 0) return selectedAccountId;

  const userAccountId = Number(user?.accountId || 0);
  if (userAccountId > 0) return userAccountId;

  return 0;
};

/**
 * @param {{
 *   page?: number;
 *   pageSize?: number;
 *   accountId?: number;
 *   search?: string;
 * }} [options]
 */
export const getdevices = async ({
  page = 1,
  pageSize = 10,
  accountId,
  search = "",
} = {}) => {
  const resolvedAccountId = Number(accountId ?? getStoredAccountId() ?? 0);
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (resolvedAccountId > 0) {
    query.set("accountId", String(resolvedAccountId));
  }

  if (search?.trim()) {
    query.set("search", search.trim());
  }

  const res = await api.get(`/api/devices/list?${query.toString()}`);
  return res.data;
};

export const getDeviceType = async () => {
  const res = await api.get(`/api/common/dropdowns/device-types`);
  return res.data;
};

export const saveDevice = async (payload) => {
  try {
    const user = getStoredUser();
    const resolvedAccountId = Number(
      payload?.accountId || getStoredAccountId() || 0,
    );
    const createdBy = Number(
      payload?.createdBy ||
        resolvedAccountId ||
        user?.accountId ||
        user?.userId ||
        0,
    );
    const requestBody = {
      accountId: resolvedAccountId,
      manufacturerId: Number(payload?.manufacturerId || 0),
      deviceTypeId: Number(payload?.deviceTypeId || 0),
      deviceNo: String(payload?.deviceNo || "").trim(),
      deviceImeiOrSerial: String(payload?.deviceImeiOrSerial || "").trim(),
      createdBy,
    };
    const res = await api.post(`/api/devices`, requestBody);
    return res.data;
  } catch (error) {
    console.error("API Error in saveDevice:", error);

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

export const getDeviceById = async (id) => {
  const res = await api.get(`/api/devices/${id}`);
  return res.data;
};

export const updateDevice = async (id, payload) => {
  try {
    const user = getStoredUser();
    const updatedBy = Number(
      payload?.updatedBy ||
        getStoredAccountId() ||
        user?.accountId ||
        user?.userId ||
        0,
    );
    const requestBody = {
      id: Number(payload?.id || id),
      manufacturerId: Number(payload?.manufacturerId || 0),
      deviceTypeId: Number(payload?.deviceTypeId || 0),
      deviceNo: String(payload?.deviceNo || "").trim(),
      deviceImeiOrSerial: String(payload?.deviceImeiOrSerial || "").trim(),
      deviceStatus: payload?.deviceStatus || "ACTIVE",
      isActive:
        typeof payload?.isActive === "boolean" ? payload.isActive : true,
      updatedBy,
    };
    const res = await api.put(`/api/devices/${id}`, requestBody);
    return res.data;
  } catch (error) {
    console.error("API Error in update Device:", error);

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

export const deleteDevice = async (id) => {
  try {
    const res = await api.delete(`/api/devices/${id}`);
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

export const exportDevices = async (accountId, search, format = "csv") => {
  try {
    const query = new URLSearchParams();
    const resolvedAccountId = Number(accountId ?? getStoredAccountId() ?? 0);
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
      `/api/devices/export${queryString ? `?${queryString}` : ""}`,
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
      `devices_export_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;

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
      message: "Devices exported successfully",
      data: null,
    };
  } catch (error) {
    console.error("API Error in exportDevices:", error);
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message:
          error.response?.data?.message ||
          "Failed to export devices. Network or server error.",
        data: null,
      }
    );
  }
};
