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

const getAccountId = (accountId) => {
  if (accountId) return accountId;
  if (typeof window === "undefined") return undefined;

  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) return undefined;
    const user = JSON.parse(userRaw);
    return user?.accountId || undefined;
  } catch (error) {
    console.error("Error parsing user for accountId:", error);
    return undefined;
  }
};

export const getDrivers = async (
  page = 1,
  pageSize = 10,
  searchQuery = "",
  accountId,
) => {
  const resolvedAccountId = getAccountId(accountId);
  const searchParam = searchQuery
    ? `&search=${encodeURIComponent(searchQuery)}`
    : "";
  const accountParam = resolvedAccountId
    ? `&accountId=${encodeURIComponent(resolvedAccountId)}`
    : "";
  const res = await api.get(
    `/api/drivers/list?page=${page}&pageSize=${pageSize}${accountParam}${searchParam}`,
  );
  return res.data;
};

export const getDriverById = async (id) => {
  const res = await api.get(`/api/drivers/${id}`);
  return res.data;
};

export const saveDriver = async (payload) => {
  try {
    const resolvedAccountId = getAccountId(payload?.accountId);
    const accountIdNumber = Number(resolvedAccountId || 0);
    const finalPayload = {
      ...payload,
      accountId: accountIdNumber,
      createdBy: Number(payload?.createdBy || accountIdNumber || 0),
    };
    const res = await api.post(`/api/drivers`, finalPayload);
    return res.data;
  } catch (error) {
    console.error("API Error in saveDriver:", error);
    return buildErrorResponse(error);
  }
};

export const updateDriver = async (payload, id) => {
  try {
    const resolvedAccountId = getAccountId(payload?.accountId);
    const accountIdNumber = Number(resolvedAccountId || 0);
    const finalPayload = {
      ...payload,
      accountId: accountIdNumber,
      updatedBy: Number(payload?.updatedBy || accountIdNumber || 0),
    };
    const res = await api.put(`/api/drivers/${id}`, finalPayload);
    return res.data;
  } catch (error) {
    console.error("API Error in updateDriver:", error);
    return buildErrorResponse(error);
  }
};

export const deleteDriver = async (id) => {
  try {
    const res = await api.delete(`/api/drivers/${id}`);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const exportDrivers = async (accountId, search, format = "csv") => {
  try {
    const resolvedAccountId = getAccountId(accountId);
    const res = await api.get(`/api/drivers/export`, {
      params: {
        accountId: resolvedAccountId,
        search,
        format: format && ["excel", "csv"].includes(format) ? format : "csv",
      },
      responseType: "blob",
      headers: { Accept: "*/*" },
    });

    const contentType = res.headers?.["content-type"] || "text/csv";
    const blob = new Blob([res.data], { type: contentType });
    const contentDisposition = res.headers?.["content-disposition"] || "";
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const ext = format === "excel" ? "xlsx" : "csv";
    const fileName =
      fileNameMatch?.[1] ||
      `drivers_export_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;

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
      message: "Drivers exported successfully",
      data: null,
    };
  } catch (error) {
    console.error("API Error in exportDrivers:", error);
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message:
          error.response?.data?.message ||
          "Failed to export drivers. Network or server error.",
        data: null,
      }
    );
  }
};
