import api from "./apiService";

export const getInvoices = async (page, pageSize, searchQuery) => {
  const skip = Math.max((Number(page || 1) - 1) * Number(pageSize || 10), 0);
  const take = Number(pageSize || 10);

  const res = await api.get(`/api/billing/invoices`, {
    params: {
      skip,
      take,
      search: searchQuery || undefined,
    },
  });

  const payload = res?.data || {};
  const rawItems = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.items)
      ? payload.data.items
      : [];

  return {
    ...payload,
    data: {
      items: rawItems,
      totalRecords: Number(
        payload?.data?.totalRecords ?? payload?.totalRecords ?? rawItems.length,
      ),
    },
  };
};

export const createManualInvoice = async (payload) => {
  try {
    const res = await api.post(`/api/billing/invoices/manual`, payload);
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

export const exportInvoices = async (page = 1, pageSize = 500) => {
  const skip = Math.max((Number(page || 1) - 1) * Number(pageSize || 500), 0);
  const take = Number(pageSize || 500);
  const res = await api.get(`/api/billing/invoices/export`, {
    params: { skip, take },
    responseType: "blob",
  });

  const blob = res?.data;
  const contentType = res?.headers?.["content-type"] || "";
  if (contentType.includes("application/json")) {
    const text = await blob.text();
    return JSON.parse(text);
  }

  const contentDisposition = res?.headers?.["content-disposition"] || "";
  const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  const fileName = fileNameMatch?.[1] || "invoices-export.xlsx";

  return {
    success: true,
    statusCode: 200,
    message: "Export generated",
    data: { blob, fileName },
  };
};
