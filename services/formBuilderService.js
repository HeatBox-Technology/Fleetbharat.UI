import api from "./apiService";

const normalizeBuilderItem = (item = {}) => ({
  ...item,
  formBuilderId: Number(
    item?.formBuilderId ?? item?.id ?? item?.formId ?? item?.builderId ?? 0,
  ),
  accountId: Number(item?.accountId ?? 0),
  fkFormId: Number(item?.fkFormId ?? item?.formId ?? 0),
  formTitle: String(item?.formTitle ?? item?.title ?? item?.formName ?? ""),
  formCode: String(item?.formCode ?? ""),
  description: String(item?.description ?? ""),
  rawData: String(item?.rawData ?? ""),
  isActive: Boolean(item?.isActive),
  projectName: String(item?.projectName ?? item?.moduleName ?? ""),
  accountName: String(item?.accountName ?? ""),
  formName: String(item?.formName ?? ""),
  createdAt: item?.createdAt,
  updatedAt: item?.updatedAt,
});

const normalizeListResponse = (responseData = {}) => {
  const payload = responseData?.data ?? {};
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
      ? payload
      : [];

  return {
    ...responseData,
    data: {
      ...payload,
      items: items.map(normalizeBuilderItem),
      totalRecords: Number(
        payload?.totalRecords ?? payload?.totalCount ?? items.length ?? 0,
      ),
    },
  };
};

export const getFormBuilders = async ({
  accountId,
  fkFormId,
  search = "",
  pageNumber = 1,
  pageSize = 10,
}) => {
  const params = {
    accountId: Number(accountId || 0),
    pageNumber: Number(pageNumber || 1),
    pageSize: Number(pageSize || 10),
  };

  if (Number(fkFormId || 0) > 0) {
    params.fkFormId = Number(fkFormId);
  }

  if (String(search || "").trim()) {
    params.search = String(search).trim();
  }

  const res = await api.get(`/api/form-builder`, { params });
  return normalizeListResponse(res.data);
};

export const getFormBuilderById = async (id) => {
  const res = await api.get(`/api/form-builder/${id}`);
  return {
    ...res.data,
    data: normalizeBuilderItem(res.data?.data ?? {}),
  };
};

export const createFormBuilder = async (payload) => {
  try {
    const res = await api.post(`/api/form-builder`, payload);
    return {
      ...res.data,
      data: normalizeBuilderItem(res.data?.data ?? {}),
    };
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

export const updateFormBuilder = async (id, payload) => {
  try {
    const res = await api.put(`/api/form-builder/${id}`, payload);
    return {
      ...res.data,
      data: normalizeBuilderItem(res.data?.data ?? {}),
    };
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

export const deleteFormBuilder = async (id, payload) => {
  try {
    const res = await api.delete(`/api/form-builder/${id}`, {
      data: payload,
    });
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

export const getActiveFormBuilderByAccountAndForm = async ({
  accountId,
  fkFormId,
}) => {
  const res = await api.get(`/api/form-builder/by-account-form`, {
    params: {
      accountId: Number(accountId || 0),
      fkFormId: Number(fkFormId || 0),
    },
  });

  return {
    ...res.data,
    data: normalizeBuilderItem(res.data?.data ?? {}),
  };
};
