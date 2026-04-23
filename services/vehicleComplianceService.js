import { getStoredAccountId, getStoredUserId } from "@/utils/storage";
import api from "./apiService";

const withErrorFallback = (error, fallbackMessage) =>
  error.response?.data || {
    success: false,
    statusCode: error.response?.status || 500,
    message: error.response?.data?.message || fallbackMessage,
    data: null,
  };

const toIsoDateTime = (dateValue) => {
  const value = String(dateValue || "").trim();
  if (!value) return null;
  return `${value}T00:00:00.000Z`;
};

const resolveActorId = (payload) => {
  const explicitActorId = Number(payload?.createdBy || payload?.updatedBy || 0);
  if (explicitActorId > 0) return explicitActorId;

  const storedUserId = Number(getStoredUserId() || 0);
  if (storedUserId > 0) return storedUserId;

  return Number(getStoredAccountId(payload?.accountId) || 0);
};

const buildJsonPayload = (payload, mode) => {
  const actorId = resolveActorId(payload);
  const basePayload = {
    accountId: Number(payload?.accountId || 0),
    vehicleId: Number(payload?.vehicleId || 0),
    complianceType: String(payload?.complianceType || "").trim(),
    documentNumber: String(payload?.documentNumber || "").trim(),
    issueDate: toIsoDateTime(payload?.issueDate),
    expiryDate: toIsoDateTime(payload?.expiryDate),
    reminderBeforeDays: Number(payload?.reminderBeforeDays || 7),
    documentPath: payload?.documentPath || null,
    documentFileName: payload?.documentFileName || null,
    remarks: String(payload?.remarks || "").trim() || null,
  };

  if (mode === "create") {
    return {
      ...basePayload,
      createdBy: actorId,
    };
  }

  return {
    ...basePayload,
    updatedBy: actorId,
  };
};

const buildFormPayload = (payload, file, mode) => {
  const actorId = resolveActorId(payload);
  const formData = new FormData();
  formData.append("AccountId", String(Number(payload?.accountId || 0)));
  formData.append("VehicleId", String(Number(payload?.vehicleId || 0)));
  formData.append(
    "ComplianceType",
    String(payload?.complianceType || "").trim(),
  );
  formData.append(
    "DocumentNumber",
    String(payload?.documentNumber || "").trim(),
  );
  formData.append("IssueDate", String(payload?.issueDate || "").trim());
  formData.append("ExpiryDate", String(payload?.expiryDate || "").trim());
  formData.append(
    "ReminderBeforeDays",
    String(Number(payload?.reminderBeforeDays || 7)),
  );

  const remarks = String(payload?.remarks || "").trim();
  if (remarks) {
    formData.append("Remarks", remarks);
  }

  if (mode === "create") {
    formData.append("CreatedBy", String(actorId));
  } else {
    formData.append("UpdatedBy", String(actorId));
  }

  if (file) {
    formData.append("Document", file);
  }

  return formData;
};

export const getComplianceList = async (
  page = 1,
  pageSize = 10,
  filters = {},
) => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    const validFilters = {
      accountId: filters?.accountId,
      vehicleId: filters?.vehicleId,
      complianceType: filters?.complianceType,
      status: filters?.status,
      search: filters?.search,
    };

    Object.entries(validFilters).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        params.set(key, String(value));
      }
    });

    const res = await api.get(
      `/api/vehicle-compliance/list?${params.toString()}`,
    );
    return res.data;
  } catch (error) {
    return withErrorFallback(error, "Failed to load compliance records");
  }
};

export const getComplianceById = async (id) => {
  try {
    const res = await api.get(`/api/vehicle-compliance/${id}`);
    return res.data;
  } catch (error) {
    return withErrorFallback(error, "Failed to load compliance record");
  }
};

export const createCompliance = async (payload, file) => {
  try {
    const hasFile = file instanceof File;
    const res = hasFile
      ? await api.post(
          `/api/vehicle-compliance/form`,
          buildFormPayload(payload, file, "create"),
        )
      : await api.post(
          `/api/vehicle-compliance`,
          buildJsonPayload(payload, "create"),
        );
    return res.data;
  } catch (error) {
    return withErrorFallback(error, "Failed to create compliance record");
  }
};

export const updateCompliance = async (id, payload, file) => {
  try {
    const hasFile = file instanceof File;
    const res = hasFile
      ? await api.put(
          `/api/vehicle-compliance/${id}/form`,
          buildFormPayload(payload, file, "update"),
        )
      : await api.put(
          `/api/vehicle-compliance/${id}`,
          buildJsonPayload(payload, "update"),
        );
    return res.data;
  } catch (error) {
    return withErrorFallback(error, "Failed to update compliance record");
  }
};

export const deleteCompliance = async (id) => {
  try {
    const res = await api.delete(`/api/vehicle-compliance/${id}`);
    return res.data;
  } catch (error) {
    return withErrorFallback(error, "Failed to delete compliance record");
  }
};
