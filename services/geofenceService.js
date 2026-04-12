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

const logUnexpectedApiError = (label, error) => {
  if (!error?.response || Number(error.response.status) >= 500) {
    console.error(label, error);
  }
};

const getUserData = () => {
  if (typeof window === "undefined") {
    return { accountId: 0 };
  }

  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) return { accountId: 0 };
    const user = JSON.parse(userRaw);
    return {
      accountId: Number(user?.accountId || 0),
    };
  } catch (error) {
    console.error("Error parsing user data:", error);
    return { accountId: 0 };
  }
};

const normalizeCoordinate = (point = {}) => ({
  latitude: Number(point?.latitude ?? point?.lat ?? 0),
  longitude: Number(point?.longitude ?? point?.lng ?? 0),
});

const toClassificationCode = (value = "") =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

const toClassificationLabel = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeClassificationPayload = (payload = {}) => {
  const rawCode = String(payload?.classificationCode || "").trim();
  const rawLabel = String(
    payload?.classificationLabel || payload?.classification || "",
  ).trim();

  const classificationCode = toClassificationCode(rawCode || rawLabel);
  const classificationLabel = toClassificationLabel(rawLabel || rawCode);

  if (!classificationCode && !classificationLabel) {
    return {};
  }

  return {
    classification: classificationCode || classificationLabel,
    classificationCode: classificationCode || undefined,
    classificationLabel: classificationLabel || undefined,
  };
};

const buildGeomPayload = (payload = {}) => {
  const geometryType = String(payload?.geometryType || "").toUpperCase();
  const coordinates = Array.isArray(payload?.coordinates)
    ? payload.coordinates.map(normalizeCoordinate)
    : [];

  if (!geometryType || coordinates.length === 0) {
    return {};
  }

  if (geometryType === "POLYGON" && coordinates.length >= 3) {
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    const closedCoordinates =
      first.latitude === last.latitude && first.longitude === last.longitude
        ? coordinates
        : [...coordinates, first];
    const polygonWkt = `POLYGON((${closedCoordinates
      .map((point) => `${point.longitude} ${point.latitude}`)
      .join(", ")}))`;

    return {
      coordinates: closedCoordinates,
      coordinatesJson: JSON.stringify(closedCoordinates),
      geom: polygonWkt,
      geometryWkt: polygonWkt,
    };
  }

  if (geometryType === "CIRCLE" || geometryType === "POINT") {
    const center = coordinates[0];
    const pointWkt = `POINT(${center.longitude} ${center.latitude})`;

    return {
      coordinates: [center],
      coordinatesJson: JSON.stringify([center]),
      geom: pointWkt,
      geometryWkt: pointWkt,
    };
  }

  return {};
};

export const getGeofences = async (
  page = 1,
  pageSize = 10,
  search = "",
  accountId,
) => {
  try {
    const { accountId: userAccountId } = getUserData();
    const resolvedAccountId = Number(accountId || userAccountId || 0);
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
    const res = await api.get(`/api/geofences/list?${query.toString()}`);
    return res.data;
  } catch (error) {
    console.error("API Error in getGeofences:", error);
    return buildErrorResponse(error);
  }
};

export const createGeofence = async (payload) => {
  try {
    const { accountId } = getUserData();
    const resolvedAccountId = Number(accountId || 0);
    const finalPayload = {
      ...payload,
      ...normalizeClassificationPayload(payload),
      ...buildGeomPayload(payload),
      createdBy: Number(payload?.createdBy || resolvedAccountId || 0),
    };
    const res = await api.post(`/api/geofences`, finalPayload);
    return res.data;
  } catch (error) {
    logUnexpectedApiError("API Error in createGeofence:", error);
    return buildErrorResponse(error);
  }
};

export const getGeofenceById = async (id) => {
  try {
    const res = await api.get(`/api/geofences/${id}`);
    return res.data;
  } catch (error) {
    logUnexpectedApiError("API Error in getGeofenceById:", error);
    return buildErrorResponse(error);
  }
};

export const updateGeofence = async (id, payload) => {
  try {
    const { accountId } = getUserData();
    const resolvedAccountId = Number(payload?.accountId || accountId || 0);
    const finalPayload = {
      ...payload,
      ...normalizeClassificationPayload(payload),
      ...buildGeomPayload(payload),
      accountId: resolvedAccountId,
      updatedBy: Number(payload?.updatedBy || resolvedAccountId || 0),
      updatedAt: payload?.updatedAt || new Date().toISOString(),
    };
    const res = await api.put(`/api/geofences/${id}`, finalPayload);
    return res.data;
  } catch (error) {
    logUnexpectedApiError("API Error in updateGeofence:", error);
    return buildErrorResponse(error);
  }
};

export const deleteGeofence = async (id) => {
  try {
    const res = await api.delete(`/api/geofences/${id}`);
    return (
      res.data || {
        success: true,
        statusCode: res.status,
        message: "Geofence deleted successfully.",
        data: null,
      }
    );
  } catch (error) {
    return buildErrorResponse(error);
  }
};

export const exportGeofences = async (accountId, search, format = "csv") => {
  try {
    const { accountId: userAccountId } = getUserData();
    const resolvedAccountId = Number(accountId || userAccountId || 0);
    const res = await api.get(`/api/geofences/export`, {
      params: {
        accountId: resolvedAccountId > 0 ? resolvedAccountId : undefined,
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
      `geofences_export_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;

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
      message: "Geofences exported successfully",
      data: null,
    };
  } catch (error) {
    console.error("API Error in exportGeofences:", error);
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message:
          error.response?.data?.message ||
          "Failed to export geofences. Network or server error.",
        data: null,
      }
    );
  }
};
