import api from "./apiService";

const toStringOrEmpty = (value) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

// helper that converts a variety of input values into the string
// representation that the backend seems to use (e.g. "Active"/"Inactive").
// the API sample shows "Active" for enabled records, so we normalise
// both boolean flags and legacy strings accordingly.
const normalizeStatus = (src) => {
  if (src === undefined || src === null) return "Inactive";
  const s = String(src).trim().toLowerCase();
  if (s === "true" || s === "active" || s === "enabled") return "Active";
  if (s === "false" || s === "inactive" || s === "disabled") return "Inactive";
  // otherwise just return the original string with first-letter capitalised
  return src.charAt(0).toUpperCase() + src.slice(1);
};

const normalizeVehicleTypePayload = (payload = {}) => ({
  id: Number(payload.id || 0),
  accountId: Number(payload.accountId || 0),
  vehicleTypeName: payload.vehicleTypeName || "",
  category: payload.category || "",
  movingIcon: payload.movingIcon ?? null,
  stoppedIcon: payload.stoppedIcon ?? null,
  idleIcon: payload.idleIcon ?? null,
  parkedIcon: payload.parkedIcon ?? null,
  offlineIcon: payload.offlineIcon ?? null,
  breakdownIcon: payload.breakdownIcon ?? null,
  seatingCapacity: Number(payload.seatingCapacity || 0),
  wheelsCount: Number(payload.wheelsCount || 0),
  fuelCategory: payload.fuelCategory || "",
  tankCapacity: toStringOrEmpty(payload.tankCapacity),
  defaultSpeedLimit: toStringOrEmpty(payload.defaultSpeedLimit),
  defaultIdleThreshold: toStringOrEmpty(payload.defaultIdleThreshold),
  status: normalizeStatus(payload.status),
});

export const getVehicleTypes = async (accountId = 0) => {
  try {
    const query = Number(accountId) > 0 ? `?accountId=${Number(accountId)}` : "";
    const res = await api.get(`/api/VehicleType${query}`);
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

export const saveVehicleType = async (payload) => {
  try {
    const requestBody = normalizeVehicleTypePayload({ ...payload, id: 0 });
    const res = await api.post(`/api/VehicleType`, requestBody);
    return res.data;
  } catch (error) {
    console.error("API Error in saveVehicleType:", error);
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

export const getVehicleTypeById = async (id) => {
  try {
    const res = await api.get(`/api/VehicleType/${id}`);
    return res.data;
  } catch (error) {
    console.error("API Error in getVehicleTypeById:", error);
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

export const updateVehicleTypeById = async (id, payload) => {
  try {
    const requestBody = normalizeVehicleTypePayload({ ...payload, id });
    const res = await api.put(`/api/VehicleType/${id}`, requestBody);
    return res.data;
  } catch (error) {
    console.error("API Error in updateVehicleTypeById:", error);
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

export const deleteVehicleTypeById = async (id) => {
  try {
    const res = await api.delete(`/api/VehicleType/${id}`);
    return (
      res.data || {
        success: true,
        statusCode: res.status,
        message: "Vehicle type deleted successfully.",
        data: null,
      }
    );
  } catch (error) {
    console.error("API Error in deleteVehicleTypeById:", error);
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

export const updateVehicleTypeStatus = async (id, payload, isEnabled) => {
  const statusPayload = {
    ...payload,
    id,
    status: isEnabled ? "Active" : "Inactive",
  };
  return updateVehicleTypeById(id, statusPayload);
};

export const uploadVehicleTypeIcons = async (accountId, vehicleTypeId, files) => {
  try {
    const formData = new FormData();
    const fieldMap = {
      movingIconFile: "MovingIcon",
      stoppedIconFile: "StoppedIcon",
      idleIconFile: "IdleIcon",
      parkedIconFile: "ParkedIcon",
      offlineIconFile: "OfflineIcon",
      breakdownIconFile: "BreakdownIcon",
    };

    Object.entries(fieldMap).forEach(([fileKey, fieldName]) => {
      const file = files?.[fileKey];
      if (file instanceof File) {
        formData.append(fieldName, file);
      }
    });

    if (![...formData.keys()].length) {
      return {
        success: true,
        statusCode: 200,
        message: "No icons selected for upload.",
        data: null,
      };
    }

    const res = await api.post(
      `/api/VehicleType/${accountId}/${vehicleTypeId}/icons`,
      formData,
    );
    return res.data;
  } catch (error) {
    console.error("API Error in uploadVehicleTypeIcons:", error);
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
