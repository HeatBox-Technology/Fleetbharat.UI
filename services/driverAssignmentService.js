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

/**
 * Fetch list of driver assignments
 */
export const getDriverAssignments = async (
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
    `/api/assignments/list?page=${page}&pageSize=${pageSize}${accountParam}${searchParam}`,
  );
  return res.data;
};

/**
 * Get assignment detail by ID
 */
export const getAssignmentById = async (id) => {
  const res = await api.get(`/api/assignments/${id}`);
  return res.data;
};

/**
 * Create a new assignment
 */
export const saveAssignment = async (payload) => {
  try {
    const resolvedAccountId = getAccountId(payload?.accountId);
    const accountIdNumber = Number(resolvedAccountId || 0);
    const finalPayload = {
      ...payload,
      accountId: accountIdNumber,
      createdBy: Number(payload?.createdBy || accountIdNumber || 0),
    };
    const res = await api.post(`/api/assignments`, finalPayload);
    return res.data;
  } catch (error) {
    console.error("API Error in saveAssignment:", error);
    return buildErrorResponse(error, "Failed to commit assignment");
  }
};

/**
 * Update an existing assignment
 */
export const updateAssignment = async (payload, id) => {
  try {
    const resolvedAccountId = getAccountId(payload?.accountId);
    const accountIdNumber = Number(resolvedAccountId || 0);
    const finalPayload = {
      ...payload,
      accountId: accountIdNumber,
      updatedBy: Number(payload?.updatedBy || accountIdNumber || 0),
    };
    const res = await api.put(`/api/assignments/${id}`, finalPayload);
    return res.data;
  } catch (error) {
    console.error("API Error in updateAssignment:", error);
    return buildErrorResponse(error, "Failed to update assignment");
  }
};

/**
 * Delete an assignment
 */
export const deleteAssignment = async (id) => {
  try {
    const res = await api.delete(`/api/assignments/${id}`);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error, "Failed to delete assignment");
  }
};

/**
 * Helper to get vehicles for the assignment dropdown
 */
export const getVehiclesForDropdown = async (accountId) => {
  try {
    const resolvedAccountId = getAccountId(accountId);
    const res = await api.get(`/api/vehicles/list?accountId=${resolvedAccountId}&pageSize=100`);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error);
  }
};