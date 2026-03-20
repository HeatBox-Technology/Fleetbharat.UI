import api from "./apiService";

const normalizeNetworkProvider = (item = {}) => ({
  id: Number(item?.id ?? item?.accountId ?? item?.networkProviderId ?? 0),
  code: String(
    item?.code ?? item?.accountCode ?? item?.providerCode ?? "",
  ).trim(),
  name: String(
    item?.name ??
      item?.accountName ??
      item?.instance ??
      item?.providerName ??
      item?.networkProviderName ??
      "",
  ).trim(),
  raw: item,
});

export const getNetworkProviders = async (
  page = 1,
  pageSize = 10,
  search = "",
) => {
  const res = await api.get(
    `/api/accounts?page=${page}&pageSize=${pageSize}&search=${search}`,
  );
  return res.data;
};

export const getNetworkProviderDropdown = async () => {
  const response = await getNetworkProviders(1, 500, "");
  const rows = Array.isArray(response?.data?.pageData?.items)
    ? response.data.pageData.items
    : [];

  return {
    statusCode: Number(response?.statusCode || 200),
    data: rows
      .map(normalizeNetworkProvider)
      .filter((item) => item.id > 0 && item.name),
  };
};

