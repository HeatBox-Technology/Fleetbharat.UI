import { javaApi } from "./apiService";
import { getDeviceMaps } from "./devicemapService";

const normalizeNumber = (value) => Number(value || 0);
const normalizeString = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";

  const lowered = normalized.toLowerCase();
  if (lowered === "undefined" || lowered === "null") {
    return "";
  }

  return normalized;
};

const sameText = (left, right) =>
  normalizeString(left).toLowerCase() === normalizeString(right).toLowerCase();

export const resolveVehicleGeofenceDeviceNo = async (source = {}) => {
  const directDeviceNo = normalizeString(
    source.deviceNo ?? source.deviceNumber ?? source.imei,
  );
  if (directDeviceNo) return directDeviceNo;

  const accountId = normalizeNumber(source.accountId);
  const vehicleId = normalizeNumber(source.vehicleId);
  const vehicleNo = normalizeString(source.vehicleNo);
  if (!vehicleId && !vehicleNo) return "";

  const findDeviceNoFromResponse = (response) => {
    const items = Array.isArray(response?.data?.assignments?.items)
      ? response.data.assignments.items
      : Array.isArray(response?.data?.pageData?.items)
        ? response.data.pageData.items
        : Array.isArray(response?.data?.items)
          ? response.data.items
          : Array.isArray(response?.data)
            ? response.data
            : [];

    const matched = items.find(
      (item) =>
        normalizeNumber(
          item?.vehicleId ?? item?.VehicleId ?? item?.fk_VehicleId,
        ) === vehicleId ||
        sameText(
          item?.vehicleNo ??
            item?.VehicleNo ??
            item?.vehicleNumber ??
            item?.VehicleNumber ??
            item?.registrationNo ??
            item?.RegistrationNo,
          vehicleNo,
        ),
    );

    return normalizeString(
      matched?.deviceNo ??
        matched?.DeviceNo ??
        matched?.deviceNumber ??
        matched?.DeviceNumber ??
        matched?.imei ??
        matched?.Imei,
    );
  };

  try {
    if (accountId) {
      const scopedResponse = await getDeviceMaps({
        page: 1,
        pageSize: 1000,
        accountId,
      });
      const scopedDeviceNo = findDeviceNoFromResponse(scopedResponse);
      if (scopedDeviceNo) return scopedDeviceNo;
    }

    const fallbackResponse = await getDeviceMaps({
      page: 1,
      pageSize: 1000,
    });
    return findDeviceNoFromResponse(fallbackResponse);
  } catch (error) {
    console.error("Failed to resolve device number for vehicle-geofence sync:", error);
    return "";
  }
};

export const buildVehicleGeofenceJavaPayload = async (source = {}) => {
  const resolvedDeviceNo = await resolveVehicleGeofenceDeviceNo(source);
  const payload = [
    {
      vehicleId: normalizeString(source.vehicleId),
      vehicleNo: normalizeString(source.vehicleNo),
      deviceNo: resolvedDeviceNo,
      geofence: [
        {
          geoId: normalizeNumber(source.geoId ?? source.geofenceId),
          tripNo: normalizeString(source.tripNo || "0"),
          geoPoint: normalizeString(source.geoPoint || "START"),
        },
      ],
    },
  ];

  return payload;
};

export const syncVehicleGeofenceToJava = async (source = {}) => {
  const payload = await buildVehicleGeofenceJavaPayload(source);
  const res = await javaApi.post("mapping/geofence-mapping", payload);
  return {
    success: true,
    data: res.data,
    payload,
  };
};

export const deleteVehicleGeofenceFromJava = async (source = {}) => {
  const payload = await buildVehicleGeofenceJavaPayload(source);
  try {
    const res = await javaApi.delete("mapping/geofence-mapping", {
      data: payload,
    });
    return {
      success: true,
      data: res.data,
      payload,
    };
  } catch (error) {
    console.error("[VehicleGeofence Java Delete] endpoint=mapping/geofence-mapping");
    console.error("[VehicleGeofence Java Delete] payload=", payload);
    console.error(
      "[VehicleGeofence Java Delete] response=",
      error?.response?.data || null,
    );
    throw error;
  }
};
