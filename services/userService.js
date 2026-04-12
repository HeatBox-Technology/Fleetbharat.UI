import api from "./apiService";

export const getUsers = async (page, pageSize, searchQuery) => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (searchQuery?.trim()) {
    query.set("search", searchQuery.trim());
  }
  const res = await api.get(`/api/users/GetAllUser?${query.toString()}`);
  return res.data;
};

export const getUserById = async (id) => {
  const userId = String(id ?? "").trim();
  if (!userId || userId === "0") {
    return null;
  }

  const res = await api.get(`/api/users/${userId}?userId=${userId}`);
  return res.data;
};

export const createUser = async (payload) => {
  try {
    const formData = new FormData();

    formData.append("FirstName", payload.FirstName);
    formData.append("LastName", payload.LastName);
    if (payload.UserName) {
      formData.append("UserName", payload.UserName);
    }
    formData.append("Email", payload.Email);
    formData.append("Password", payload.Password);
    formData.append("MobileNo", payload.MobileNo || "");
    formData.append("AccountId", payload.AccountId.toString());
    formData.append("RoleId", payload.RoleId.toString());
    formData.append("Status", payload.Status.toString());
    formData.append("TwoFactorEnabled", payload.TwoFactorEnabled.toString());

    // Handle array properly
    if (
      payload.AdditionalPermissions &&
      Array.isArray(payload.AdditionalPermissions)
    ) {
      payload.AdditionalPermissions.forEach((permission) => {
        formData.append("AdditionalPermissions", JSON.stringify(permission));
      });
    }

    if (payload.ProfileImage) {
      formData.append("ProfileImage", payload.ProfileImage);
    }

    const res = await api.post("/api/users", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  } catch (error) {
    return error.response?.data;
  }
};

export const updateUser = async (id, payload) => {
  try {
    const formData = new FormData();

    // 👇 ONLY FILE GOES IN BODY
    if (payload.ProfileImage) {
      formData.append("ProfileImage", payload.ProfileImage);
    }

    const res = await api.put(
      `/api/users/${id}` +
        `?userId=${id}` +
        `&Email=${encodeURIComponent(payload.Email)}` +
        `&UserName=${encodeURIComponent(payload.UserName)}` +
        `&FirstName=${encodeURIComponent(payload.FirstName)}` +
        `&LastName=${encodeURIComponent(payload.LastName)}` +
        `&MobileNo=${encodeURIComponent(payload.MobileNo || "")}` +
        `&AccountId=${payload.AccountId}` +
        `&RoleId=${payload.RoleId}` +
        `&Status=${payload.Status}` +
        `&TwoFactorEnabled=${payload.TwoFactorEnabled}` +
        `&AdditionalPermissions=${encodeURIComponent(
          JSON.stringify(payload.AdditionalPermissions),
        )}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

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

export const deleteUser = async (id) => {
  try {
    const res = await api.delete(`/api/users/${id}?userId=${id}`);
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

export const exportUsers = async (search = "", format = "csv") => {
  try {
    const query = new URLSearchParams();
    if (String(search || "").trim()) {
      query.set("search", String(search).trim());
    }
    if (format && ["excel", "csv"].includes(format)) {
      query.set("format", format);
    }

    const queryString = query.toString();
    const res = await api.get(
      `/api/users/export${queryString ? `?${queryString}` : ""}`,
      {
        responseType: "blob",
        headers: { Accept: "*/*" },
      },
    );

    const contentType = res.headers?.["content-type"] || "text/csv";
    const blob = new Blob([res.data], { type: contentType });
    const contentDisposition = res.headers?.["content-disposition"] || "";
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const ext = format === "excel" ? "xlsx" : "csv";
    const fileName =
      fileNameMatch?.[1] ||
      `users_export_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;

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
      message: "Users exported successfully",
      data: null,
    };
  } catch (error) {
    console.error("API Error in exportUsers:", error);
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message:
          error.response?.data?.message ||
          "Failed to export users. Network or server error.",
        data: null,
      }
    );
  }
};
