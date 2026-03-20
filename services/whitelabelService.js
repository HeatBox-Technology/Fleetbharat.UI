import api from "./apiService";

// ✅ Get White Labels (List with Pagination)
export const getWhiteLabels = async (page = 1, pageSize = 10, search = "") => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search?.trim()) {
    query.set("search", search.trim());
  }
  const res = await api.get(`/api/white-labels?${query.toString()}`);
  return res.data;
};

// ✅ Get White Label By ID
export const getWhiteLabelById = async (id) => {
  const res = await api.get(`/api/white-labels/${id}`);
  return res.data;
};

// ✅ Get White Label By Account ID
export const getWhiteLabelByAccountId = async (accountId) => {
  const res = await api.get(`/api/white-labels/by-account/${accountId}`);
  return res.data;
};

// ✅ Save White Label
export const saveWhiteLabel = async (payload) => {
  try {
    const res = await api.post(`/api/white-labels`, payload);
    return res.data;
  } catch (error) {
    console.error("API Error in saveWhiteLabel:", error);

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

// ✅ Update White Label
export const updateWhiteLabel = async (payload, id) => {
  try {
    const res = await api.put(`/api/white-labels/${id}`, payload);
    return res.data;
  } catch (error) {
    console.error("API Error in updateWhiteLabel:", error);

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

// ✅ Upload White Label Logos (multipart/form-data)
export const uploadWhiteLabelLogos = async ({
  accountId,
  primaryLogo,
  appLogo,
  mobileLogo,
  favicon,
  logoDark,
  logoLight,
}) => {
  try {
    const formData = new FormData();
    formData.append("AccountId", String(Number(accountId || 0)));
    if (primaryLogo) formData.append("PrimaryLogo", primaryLogo);
    if (appLogo) formData.append("AppLogo", appLogo);
    if (mobileLogo) formData.append("MobileLogo", mobileLogo);
    if (favicon) formData.append("Favicon", favicon);
    if (logoDark) formData.append("LogoDark", logoDark);
    if (logoLight) formData.append("LogoLight", logoLight);

    const res = await api.post(`/api/white-labels/logos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    console.error("API Error in uploadWhiteLabelLogos:", error);
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

// ✅ Delete White Label
export const deleteWhiteLabel = async (id) => {
  try {
    const res = await api.delete(`/api/white-labels/${id}`);
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
