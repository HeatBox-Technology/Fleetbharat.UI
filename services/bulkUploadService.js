import api from "./apiService";

export const downloadBulkTemplate = async (moduleKey, format = "excel") => {
  const response = await api.get(
    `/api/bulk-upload/template/${encodeURIComponent(moduleKey)}`,
    {
      params: { format },
      responseType: "blob",
    },
  );
  return response.data;
};

export const uploadBulkFile = async (moduleKey, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(
    `/api/bulk-upload/${encodeURIComponent(moduleKey)}`,
    formData,
  );
  return response.data;
};

export const getBulkUploadStatus = async (jobId) => {
  const response = await api.get(`/api/bulk-upload/status/${jobId}`);
  return response.data;
};

export const downloadBulkErrorReport = async (jobId) => {
  const response = await api.get(`/api/bulk-upload/error-report/${jobId}`, {
    responseType: "blob",
  });
  return response.data;
};
