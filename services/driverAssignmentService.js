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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSIGNMENT_LOGIC_REGEX = /^[A-Za-z][A-Za-z ]{1,29}$/;
const NOTES_REGEX = /^[A-Za-z0-9 .,;:()@_\-/&]*$/;

const getUserContext = () => {
  if (typeof window === "undefined") {
    return { accountId: 0, userId: 0, userGuid: "" };
  }

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const accountId = Number(user?.accountId || user?.AccountId || 0);
    const numericUserId = Number(
      user?.id || user?.userNumericId || user?.UserNumericId || 0,
    );
    const userGuid = String(user?.userId || user?.UserId || "").trim();

    return {
      accountId: Number.isFinite(accountId) ? accountId : 0,
      userId: Number.isFinite(numericUserId) ? numericUserId : 0,
      userGuid,
    };
  } catch (error) {
    console.error("Error parsing user context:", error);
    return { accountId: 0, userId: 0, userGuid: "" };
  }
};

const resolveAccountContextId = (accountContextId) => {
  const provided = Number(accountContextId || 0);
  if (Number.isFinite(provided) && provided > 0) return provided;
  return getUserContext().accountId;
};

const toIsoDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
};

const toLocalInputDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const normalizeAssignmentItem = (item) => {
  const assignmentLogic = String(
    item?.assignmentLogic || item?.basis || "",
  ).trim();

  return {
    ...item,
    id: Number(item?.id || item?.assignmentId || 0),
    assignmentId: Number(item?.id || item?.assignmentId || 0),
    accountContextId: Number(item?.accountContextId || item?.accountId || 0),
    driverId: Number(item?.driverId || 0),
    driverName: String(item?.driverName || item?.name || ""),
    vehicleId: Number(item?.vehicleId || 0),
    vehiclePlate: String(
      item?.vehicleNumber || item?.vehiclePlate || item?.plate || "",
    ),
    assignmentLogic,
    basis: assignmentLogic.toUpperCase(),
    startTime: item?.startTime || "",
    expectedEnd: item?.expectedEnd || item?.endTime || "",
    endTime: item?.expectedEnd || item?.endTime || "",
    dispatcherNotes: String(item?.dispatcherNotes || item?.notes || ""),
    notes: String(item?.dispatcherNotes || item?.notes || ""),
    isDeleted: Boolean(item?.isDeleted),
  };
};

const calculateMetrics = (items, totalRecords = 0) => {
  const now = new Date();
  const safeItems = Array.isArray(items) ? items : [];

  const active = safeItems.filter((item) => {
    const basis = String(item?.basis || "").toUpperCase();
    const expectedEnd = item?.expectedEnd ? new Date(item.expectedEnd) : null;
    return basis === "PRIMARY" && (!expectedEnd || expectedEnd >= now);
  }).length;

  const temporary = safeItems.filter(
    (item) => String(item?.basis || "").toUpperCase() === "TEMPORARY",
  ).length;

  const expired = safeItems.filter((item) => {
    if (!item?.expectedEnd) return false;
    const end = new Date(item.expectedEnd);
    return Number.isFinite(end.getTime()) && end < now;
  }).length;

  return {
    total: Number(totalRecords || safeItems.length || 0),
    active,
    temporary,
    expired,
  };
};

const normalizeListResponse = (response) => {
  const baseData = response?.data || {};
  const rawItems = Array.isArray(baseData?.items)
    ? baseData.items
    : Array.isArray(baseData?.pageData?.items)
      ? baseData.pageData.items
      : [];

  const items = rawItems.map(normalizeAssignmentItem);
  const totalRecords = Number(
    baseData?.totalRecords ||
      baseData?.pageData?.totalRecords ||
      items.length ||
      0,
  );

  const metrics =
    baseData?.metrics && typeof baseData.metrics === "object"
      ? {
          total: Number(baseData.metrics.total || totalRecords),
          active: Number(baseData.metrics.active || 0),
          temporary: Number(baseData.metrics.temporary || 0),
          expired: Number(baseData.metrics.expired || 0),
        }
      : calculateMetrics(items, totalRecords);

  return {
    ...response,
    data: {
      ...baseData,
      page: Number(baseData?.page || 1),
      pageSize: Number(baseData?.pageSize || items.length || 10),
      totalRecords,
      totalPages: Number(baseData?.totalPages || 1),
      items,
      metrics,
    },
  };
};

const validateAssignmentPayload = (payload, isUpdate = false) => {
  const errors = {};

  const accountContextId = Number(payload?.accountContextId || 0);
  const driverId = Number(payload?.driverId || 0);
  const vehicleId = Number(payload?.vehicleId || 0);
  const assignmentLogic = String(payload?.assignmentLogic || "").trim();
  const startTime = toIsoDateTime(payload?.startTime);
  const expectedEnd = payload?.expectedEnd
    ? toIsoDateTime(payload.expectedEnd)
    : null;
  const dispatcherNotes = String(payload?.dispatcherNotes || "").trim();

  if (!accountContextId) errors.accountContextId = "Account is required";
  if (!driverId) errors.driverId = "Driver is required";
  if (!vehicleId) errors.vehicleId = "Vehicle is required";

  if (!assignmentLogic) {
    errors.assignmentLogic = "Assignment logic is required";
  } else if (!ASSIGNMENT_LOGIC_REGEX.test(assignmentLogic)) {
    errors.assignmentLogic =
      "Assignment logic must contain only letters and spaces (2-30 chars)";
  }

  if (!startTime) {
    errors.startTime = "Valid start time is required";
  }

  if (payload?.expectedEnd && !expectedEnd) {
    errors.expectedEnd = "Expected end must be a valid datetime";
  }

  if (startTime && expectedEnd && new Date(expectedEnd) < new Date(startTime)) {
    errors.expectedEnd = "Expected end cannot be earlier than start time";
  }

  if (dispatcherNotes.length > 500) {
    errors.dispatcherNotes = "Dispatcher notes cannot exceed 500 characters";
  } else if (dispatcherNotes && !NOTES_REGEX.test(dispatcherNotes)) {
    errors.dispatcherNotes = "Dispatcher notes contain unsupported characters";
  }

  if (!isUpdate) {
    const createdBy = Number(payload?.createdBy || 0);
    const createdByUser = String(payload?.createdByUser || "").trim();

    if (!createdBy) errors.createdBy = "Created By is required";
    if (!createdByUser) {
      errors.createdByUser = "Created By User is required";
    } else if (!UUID_REGEX.test(createdByUser)) {
      errors.createdByUser = "Created By User must be a valid UUID";
    }
  } else {
    const updatedBy = Number(payload?.updatedBy || 0);
    const updatedByUser = String(payload?.updatedByUser || "").trim();

    if (!updatedBy) errors.updatedBy = "Updated By is required";
    if (!updatedByUser) {
      errors.updatedByUser = "Updated By User is required";
    } else if (!UUID_REGEX.test(updatedByUser)) {
      errors.updatedByUser = "Updated By User must be a valid UUID";
    }
  }

  return errors;
};

const normalizeSavePayload = (payload, isUpdate = false) => {
  const context = getUserContext();
  const accountContextId = Number(
    payload?.accountContextId || payload?.accountId || context.accountId || 0,
  );

  const normalized = {
    accountContextId,
    driverId: Number(payload?.driverId || 0),
    vehicleId: Number(payload?.vehicleId || 0),
    assignmentLogic: String(
      payload?.assignmentLogic || payload?.basis || "",
    ).trim(),
    startTime: toIsoDateTime(payload?.startTime),
    expectedEnd: payload?.expectedEnd
      ? toIsoDateTime(payload.expectedEnd)
      : null,
    dispatcherNotes: String(
      payload?.dispatcherNotes || payload?.notes || "",
    ).trim(),
  };

  if (!isUpdate) {
    normalized.createdBy = Number(
      payload?.createdBy || context.userId || accountContextId || 0,
    );
    normalized.createdByUser = String(
      payload?.createdByUser || context.userGuid || "",
    ).trim();
  } else {
    normalized.updatedBy = Number(
      payload?.updatedBy || context.userId || accountContextId || 0,
    );
    normalized.updatedByUser = String(
      payload?.updatedByUser || context.userGuid || "",
    ).trim();
  }

  return normalized;
};

/**
 * Fetch list of driver assignments
 */
export const getDriverAssignments = async (
  page = 1,
  pageSize = 10,
  search = "",
  accountContextId,
) => {
  try {
    const params = [
      `page=${page}`,
      `pageSize=${pageSize}`,
      resolveAccountContextId(accountContextId)
        ? `accountContextId=${resolveAccountContextId(accountContextId)}`
        : "",
      search ? `search=${encodeURIComponent(search)}` : "",
    ]
      .filter(Boolean)
      .join("&");

    const res = await api.get(
      `/api/driver-vehicle-assignment/GetAll?${params}`,
    );
    return normalizeListResponse(res.data);
  } catch (error) {
    return buildErrorResponse(error, "Failed to fetch assignments");
  }
};

/**
 * Get assignment detail by ID
 */
export const getAssignmentById = async (id) => {
  try {
    const res = await api.get(`/api/driver-vehicle-assignment/GetById/${id}`);
    if (res?.data?.data) {
      return {
        ...res.data,
        data: normalizeAssignmentItem(res.data.data),
      };
    }
    return res.data;
  } catch (error) {
    return buildErrorResponse(error, "Failed to fetch assignment");
  }
};

/**
 * Create a new assignment
 */
export const saveAssignment = async (payload) => {
  const normalizedPayload = normalizeSavePayload(payload, false);
  const errors = validateAssignmentPayload(normalizedPayload, false);

  if (Object.keys(errors).length) {
    return {
      success: false,
      statusCode: 400,
      message: Object.values(errors).join(", "),
      errors,
      data: null,
    };
  }

  try {
    const res = await api.post(
      `/api/driver-vehicle-assignment/Create`,
      normalizedPayload,
    );
    return res.data;
  } catch (error) {
    return buildErrorResponse(error, "Failed to create assignment");
  }
};

/**
 * Update an existing assignment
 */
export const updateAssignment = async (payload, id) => {
  if (!id || Number(id) <= 0) {
    return {
      success: false,
      statusCode: 400,
      message: "Assignment id is required for update",
      errors: { id: "Assignment id is required for update" },
      data: null,
    };
  }

  const normalizedPayload = normalizeSavePayload(payload, true);
  const errors = validateAssignmentPayload(normalizedPayload, true);

  if (Object.keys(errors).length) {
    return {
      success: false,
      statusCode: 400,
      message: Object.values(errors).join(", "),
      errors,
      data: null,
    };
  }

  try {
    const res = await api.put(
      `/api/driver-vehicle-assignment/Update/${id}`,
      normalizedPayload,
    );
    return res.data;
  } catch (error) {
    return buildErrorResponse(error, "Failed to update assignment");
  }
};

/**
 * Delete an assignment
 */
export const deleteAssignment = async (id) => {
  try {
    const res = await api.delete(`/api/driver-vehicle-assignment/Delete/${id}`);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error, "Failed to delete assignment");
  }
};

/**
 * Soft delete an assignment
 */
export const softDeleteAssignment = async (id) => {
  try {
    const res = await api.patch(
      `/api/driver-vehicle-assignment/SoftDelete/${id}`,
    );
    return res.data;
  } catch (error) {
    return buildErrorResponse(error, "Failed to soft delete assignment");
  }
};

/**
 * Helper to get vehicles for the assignment dropdown
 */
export const getVehiclesForDropdown = async (accountContextId) => {
  try {
    const resolvedAccountId = resolveAccountContextId(accountContextId);
    const endpoint = resolvedAccountId
      ? `/api/common/dropdowns/vehicles/${resolvedAccountId}`
      : `/api/common/dropdowns/vehicles`;

    const res = await api.get(endpoint);
    return res.data;
  } catch (error) {
    return buildErrorResponse(error, "Failed to fetch vehicle dropdown");
  }
};

export const toAssignmentFormModel = (assignment) => ({
  accountContextId: String(assignment?.accountContextId || ""),
  driverId: String(assignment?.driverId || ""),
  vehicleId: String(assignment?.vehicleId || ""),
  assignmentLogic:
    String(
      assignment?.assignmentLogic || assignment?.basis || "Primary",
    ).toUpperCase() === "TEMPORARY"
      ? "Temporary"
      : "Primary",
  startTime: toLocalInputDateTime(assignment?.startTime),
  expectedEnd: toLocalInputDateTime(assignment?.expectedEnd),
  dispatcherNotes: String(
    assignment?.dispatcherNotes || assignment?.notes || "",
  ),
});
