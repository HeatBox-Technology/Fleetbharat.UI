import { getStoredAccountId } from "@/utils/storage";
import api from "./apiService";

export const getAllAccounts = async () => {
  const res = await api.get(`/api/common/dropdowns/accounts?limit=0`);
  return res.data;
};

export const getAllRoles = async (id) => {
  const res = await api.get(`/api/common/dropdowns/roles?accountId=${id}`);
  return res.data;
};

export const getCountries = async () => {
  const res = await api.get(`/api/countries`);
  return res.data;
};

export const getStatesByCountry = async (countryId) => {
  const res = await api.get(`/api/states/by-country/${countryId}`);
  return res.data;
};

export const getCitiesByState = async (stateId) => {
  const res = await api.get(`/api/cities/by-state/${stateId}`);
  return res.data;
};

export const getRoleById = async (roleId, accountId) => {
  const res = await api.get(`/api/roles/${roleId}?accountId=${accountId}`);
  return res.data;
};

export const getUserRoleData = async () => {
  try {
    // Get user data from localStorage
    const userString = localStorage.getItem("user");
    if (!userString) {
      console.error("No user data found in localStorage");
      return null;
    }

    const user = JSON.parse(userString);
    const { roleId, accountId } = user;

    if (!roleId || !accountId) {
      console.error("Missing roleId or accountId in user data");
      return null;
    }

    // Fetch role details with permissions
    const roleData = await getRoleById(roleId, accountId);
    localStorage.setItem("permissions", JSON.stringify(roleData.data.rights));
    // return roleData;
  } catch (error) {
    console.error("Error fetching user role data:", error);
    return null;
  }
};

export const hasPermission = (rights, pageUrl, permission = "canRead") => {
  if (!rights || !Array.isArray(rights)) return false;

  const form = rights.find((right) => {
    // Normalize paths for comparison (remove trailing slashes)
    const normalizedRightPath = String(right.pageUrl || "")
      .replace(/\/$/, "")
      .toLowerCase();

    const normalizedPageUrl = String(pageUrl || "")
      .replace(/\/$/, "")
      .toLowerCase();

    return normalizedRightPath === normalizedPageUrl;
  });

  return form ? form[permission] : false;
};

export const getStoredFormRights = () => {
  if (typeof window === "undefined") return [];

  try {
    const userString = localStorage.getItem("user");
    const parsedUser = userString ? JSON.parse(userString) : null;
    if (Array.isArray(parsedUser?.formRights)) {
      return parsedUser.formRights;
    }

    const permissionsString = localStorage.getItem("permissions");
    const parsedPermissions = permissionsString
      ? JSON.parse(permissionsString)
      : [];
    return Array.isArray(parsedPermissions) ? parsedPermissions : [];
  } catch (error) {
    console.error("Failed to read permissions from localStorage:", error);
    return [];
  }
};

export const getPermissionPathFromPathname = (pathname = "") => {
  const segments = String(pathname).split("/").filter(Boolean);
  if (!segments.length) return "";

  if (segments[0] === "users" && segments[1] === "roles-permissions") {
    return "/users/roles-permissions";
  }

  if (segments[0] === "users" && segments[1] === "activity-logs") {
    return "/users/activity-logs";
  }

  return `/${segments[0]}`;
};

export const getFormRightForPath = (pathname = "", rights) => {
  const resolvedRights = Array.isArray(rights) ? rights : getStoredFormRights();
  const permissionPath = getPermissionPathFromPathname(pathname);
  const normalizedPermissionPath = String(permissionPath)
    .replace(/\/$/, "")
    .toLowerCase();

  if (!normalizedPermissionPath) return null;

  return (
    resolvedRights.find((right) => {
      const rightPath = String(right?.pageUrl || "")
        .replace(/\/$/, "")
        .toLowerCase();
      return rightPath === normalizedPermissionPath;
    }) || null
  );
};

export const filterMenuByPermissions = (menuItems, rights) => {
  if (!rights || !Array.isArray(rights)) return [];

  return menuItems
    .map((item) => {
      // If item has children, filter them
      if (item.children && item.children.length > 0) {
        const filteredChildren = item.children.filter((child) =>
          hasPermission(rights, child.pageUrl || child.path, "canRead"),
        );

        // Only include parent if it has accessible children
        if (filteredChildren.length > 0) {
          return {
            ...item,
            children: filteredChildren,
          };
        }
        return null;
      }

      // For items without children, check if user has read permission
      if (item.path) {
        return hasPermission(rights, item.pageUrl || item.path, "canRead")
          ? item
          : null;
      }

      // Include items without paths (like section headers)
      return item;
    })
    .filter(Boolean); // Remove null items
};

export const getCurrencies = async () => {
  const res = await api.get(`/api/common/dropdowns/Currency`);
  return res.data;
};

export const getFormModulesDropdown = async () => {
  const res = await api.get(`/api/common/dropdowns/form-modules/dropdown`);
  return res.data;
};

export const getVehicleDropdown = async (accountId) => {
  const resolvedAccountId = getStoredAccountId(accountId);
  const endpoint = resolvedAccountId
    ? `/api/common/dropdowns/vehicles/${resolvedAccountId}`
    : `/api/common/dropdowns/vehicles`;
  const res = await api.get(endpoint);
  return res.data;
};

export const getDriverDropdown = async (accountId) => {
  const resolvedAccountId = getStoredAccountId(accountId);
  const endpoint = resolvedAccountId
    ? `/api/common/dropdowns/drivers?accountId=${resolvedAccountId}`
    : `/api/common/dropdowns/drivers`;
  const res = await api.get(endpoint);
  return res.data;
};

export const getVehicleBrandOemDropdown = async () => {
  const res = await api.get(`/api/Lookup/vehicle-brand-oems`);
  return res.data;
};

export const getDeviceTypeDropdown = async () => {
  const res = await api.get(`/api/common/dropdowns/device-types`);
  return res.data;
};

export const getLookupDeviceTypeDropdown = async () => {
  const res = await api.get(`/api/Lookup/device-types`);
  return res.data;
};

export const getHardwareDropdown = async (_deviceTypeId, accountId) => {
  const resolvedAccountId = getStoredAccountId(accountId);
  const endpoint = resolvedAccountId
    ? `/api/common/dropdowns/devices/${resolvedAccountId}`
    : `/api/common/dropdowns/devices`;
  const res = await api.get(endpoint);
  return res.data;
};

export const getDeviceDropdown = async (accountId) => {
  const resolvedAccountId = getStoredAccountId(accountId);
  const endpoint = resolvedAccountId
    ? `/api/common/dropdowns/devices/${resolvedAccountId}`
    : `/api/common/dropdowns/devices`;
  const res = await api.get(endpoint);
  return res.data;
};

export const getTripTypeDropdown = async () => {
  const res = await api.get(`/api/common/dropdowns/trip-types`);
  return res.data;
};

export const getVehicleTypeDropdown = async () => {
  const res = await api.get(`/api/common/dropdowns/vehicle-types`);
  return res.data;
};

export const getCategoryDropdown = async (limit = 20) => {
  const resolvedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;
  const res = await api.get(`/api/common/dropdowns/categories`, {
    params: { limit: resolvedLimit },
  });
  return res.data;
};

export const getAccountsDropdownByCategory = async (categoryId) => {
  const resolvedCategoryId = Number(categoryId || 0);
  const res = await api.get(`/api/common/dropdowns/accounts/filter`, {
    params: { categoryId: resolvedCategoryId },
  });
  return res.data;
};

export const getGeofenceDropdownByAccount = async (accountId) => {
  const res = await api.get(`/api/common/dropdowns/geofences`, {
    params: {
      accountId: Number(accountId || 0),
      limit: 0,
    },
  });
  return res.data;
};

export const getOemManufacturersDropdown = async () => {
  const res = await api.get(`/api/common/dropdowns/manufacturers`);
  return res.data;
};

export const getSimDropdown = async () => {
  const res = await api.get(`/api/common/dropdowns/sims`);
  return res.data;
};

export const getSimDropdownByAccount = async (accountId) => {
  const endpoint = accountId
    ? `/api/common/dropdowns/sims/${accountId}`
    : `/api/common/dropdowns/sims`;
  const res = await api.get(endpoint);
  return res.data;
};
