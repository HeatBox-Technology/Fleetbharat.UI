// src/features/auth/authService.js
import api from "./apiService";

export const getAccounts = async (page, pageSize, searchQuery) => {
  const res = await api.get(
    `/api/accounts?page=${page}&pageSize=${pageSize}&search=${searchQuery}`,
  );
  return res.data;
};

export const getCategoreis = async () => {
  const res = await api.get(`/api/categories`);
  return res.data;
};

export const saveAccount = async (payload) => {
  try {
    const res = await api.post(`/api/accounts`, payload);
    return res.data;
  } catch (error) {
    console.error("API Error in saveCategory:", error);

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

export const getAccountById = async (id) => {
  const res = await api.get(`/api/accounts/${id}`);
  return res.data;
};

export const updateAccount = async (payload, id) => {
  try {
    const res = await api.put(`/api/accounts/${id}`, payload);
    return res.data;
  } catch (error) {
    console.error("API Error in saveCategory:", error);

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

export const deleteAccount = async (id) => {
  try {
    const res = await api.delete(`/api/accounts/${id}`);
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

/**
 * Hierarchy API response -> dropdown friendly flat options.
 * Example label: "IOTEdge", "  denso", "  denso"
 */
export const flattenAccountHierarchyOptions = (nodes, level = 0) => {
  if (!Array.isArray(nodes)) return [];

  const indent = "  ".repeat(level);
  return nodes.flatMap((node) => {
    const id = Number(node?.accountId || node?.id || 0);
    const name = String(
      node?.accountName || node?.value || node?.name || node?.accountCode || id,
    );
    const current = id > 0 ? [{ id, value: `${indent}${name}` }] : [];
    const children = flattenAccountHierarchyOptions(node?.children || [], level + 1);
    return [...current, ...children];
  });
};

export const getAccountHierarchy = async () => {
  try {
    const res = await api.get(`/api/accounts/hierarchy`);
    const raw = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];

    return {
      ...(res?.data || {}),
      data: flattenAccountHierarchyOptions(raw),
      rawHierarchy: raw,
    };
  } catch (error) {
    console.error("API Error in getAccountHierarchy:", error);
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || "Network or server error",
        data: [],
        rawHierarchy: [],
      }
    );
  }
};
