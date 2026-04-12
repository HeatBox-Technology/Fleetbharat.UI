import api from "./apiService";
import { getNetworkProviderDropdown } from "./networkProviderService";

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

  const selectedAccountId = Number(localStorage.getItem("accountId") || 0);
  if (selectedAccountId > 0) return selectedAccountId;

  const user = getStoredUser();
  return Number(user?.accountId || 0);
};

const buildSimPayload = (payload = {}, { isEdit = false, id } = {}) => {
  const user = getStoredUser();
  const resolvedAccountId = Number(
    payload?.accountId || getStoredAccountId() || user?.accountId || 0,
  );
  const actorId = Number(
    payload?.[isEdit ? "updatedBy" : "createdBy"] ||
      resolvedAccountId ||
      user?.userId ||
      user?.id ||
      0,
  );
  const isActive =
    typeof payload?.isActive === "boolean"
      ? payload.isActive
      : String(payload?.statusKey || "active").toLowerCase() !== "inactive";

  return {
    ...(isEdit ? { simId: Number(payload?.simId || id || 0) } : {}),
    accountId: resolvedAccountId,
    iccid: String(payload?.iccid || "").trim(),
    msisdn: String(payload?.msisdn || "").trim(),
    imsi: String(payload?.imsi || "").trim(),
    networkProviderId: Number(payload?.networkProviderId || 0),
    activatedAt: payload?.activatedAt || null,
    expiryAt: payload?.expiryAt || null,
    statusKey:
      String(payload?.statusKey || "")
        .trim()
        .toLowerCase() === "inactive"
        ? "inactive"
        : "active",
    isActive,
    ...(isEdit ? { updatedBy: actorId } : { createdBy: actorId }),
  };
};

// ── GET all SIMs (paginated) ───────────────────────────────────────────────
export const getSims = async (pageNo, pageSize, search = "", accountId) => {
  const resolvedAccountId = Number(accountId || getStoredAccountId() || 0);
  const query = new URLSearchParams({
    pageNo: String(pageNo),
    pageSize: String(pageSize),
  });
  if (resolvedAccountId > 0) {
    query.set("accountId", String(resolvedAccountId));
  }
  if (search?.trim()) {
    query.set("search", search.trim());
  }
  const response = await api.get(`/api/sims/list?${query.toString()}`);
  return response.data;
};

// ── GET single SIM by ID ──────────────────────────────────────────────────
export const getSimById = async (id) => {
  const response = await api.get(`/api/sims/${id}`);
  return response.data;
};

// ── POST create SIM ────────────────────────────────────────────────────────
export const saveSim = async (payload) => {
  try {
    const requestPayload = buildSimPayload(payload);
    const response = await api.post(`/api/sims`, requestPayload);
    return response.data;
  } catch (error) {
    console.error("API Error in saveSim:", error);
    return buildErrorResponse(error);
  }
};

// ── PUT update SIM ─────────────────────────────────────────────────────────
export const updateSim = async (id, payload) => {
  try {
    const requestPayload = buildSimPayload(payload, { isEdit: true, id });
    const response = await api.put(`/api/sims/${id}`, requestPayload);
    return response.data;
  } catch (error) {
    console.error("API Error in updateSim:", error);
    return buildErrorResponse(error);
  }
};

// ── DELETE SIM ─────────────────────────────────────────────────────────────
export const deleteSim = async (simId) => {
  try {
    const response = await api.delete(`/api/sims/${simId}`);
    return (
      response.data || {
        success: true,
        statusCode: response.status,
        message: "SIM deleted successfully.",
        data: null,
      }
    );
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

export const exportSims = async (accountId, search, format = "csv") => {
  try {
    const query = new URLSearchParams();
    const resolvedAccountId = Number(accountId || getStoredAccountId() || 0);
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
      `/api/sims/export${queryString ? `?${queryString}` : ""}`,
      {
        responseType: "blob",
        headers: { Accept: "*/*" },
      },
    );

    const contentType =
      res.headers?.["content-type"] ||
      (format === "excel"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv;charset=utf-8;");
    const blob = new Blob([res.data], { type: contentType });
    const contentDisposition = res.headers?.["content-disposition"] || "";
    const fileNameMatch =
      contentDisposition.match(/filename\*=(?:UTF-8'')?([^;\n]+)/i) ||
      contentDisposition.match(/filename="?([^"]+)"?/i);
    let fileName = fileNameMatch?.[1]
      ? fileNameMatch[1].replace(/(^"|"$)/g, "")
      : null;
    if (fileName) {
      try {
        fileName = decodeURIComponent(fileName);
      } catch {
        // keep raw filename if decoding fails
      }
    }
    fileName =
      fileName ||
      `sims_export_${new Date().toISOString().replace(/[:.]/g, "-")}.${
        format === "excel" ? "xlsx" : "csv"
      }`;

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
      message: "SIMs exported successfully",
      data: null,
    };
  } catch (error) {
    console.error("API Error in exportSims:", error);
    return buildErrorResponse(
      error,
      "Failed to export SIMs. Network or server error.",
    );
  }
};

// ── GET carriers list ──────────────────────────────────────────────────────
export const getSimCarriers = async () => {
  return getNetworkProviderDropdown();
};
