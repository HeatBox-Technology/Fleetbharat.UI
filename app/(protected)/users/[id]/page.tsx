"use client";

import { Building2, Lock, Shield, Upload, User, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Card } from "@/components/CommonCard";
import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown from "@/components/SearchableDropdown";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { UserFormData } from "@/interfaces/user.interface";
import { getAllAccounts, getAllRoles } from "@/services/commonServie";
import { getRoleById } from "@/services/rolesService";
import { createUser, getUserById, updateUser, resetPassword } from "@/services/userService";

type TabType = "profile" | "access" | "security";

interface Account {
  id: number;
  value: string;
}

interface Role {
  id: number;
  value: string;
}

interface Permission {
  formId: number;
  formName: string;
  moduleName: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canExport: boolean;
}
interface AdditionalPermission {
  accountId: number;
  formId: number;
  canRead: boolean;
  canWrite: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  canAll: boolean;
}

const CreateUser: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const t = useTranslations("pages.users.detail");
  const tList = useTranslations("pages.users.list");
  const params = useParams();
  const id = params?.id;
  const isCreateMode = String(id || "0") === "0";
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    accountName: "",
    accountCode: "",
    userName: "",
    password: "",
    accountId: 7, // Static for testing - AddRole reference
    roleId: 0,
    primaryDomain: "",
    fullName: "",
    emailAddress: "",
    phoneNumber: "",
    location: "",
  });
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");

  const countryCodes = [
    { code: "+91", country: "India" },
    { code: "+1", country: "USA/Canada" },
    { code: "+44", country: "UK" },
    { code: "+971", country: "UAE" },
    { code: "+61", country: "Australia" },
    { code: "+65", country: "Singapore" },
  ];

  const splitPhoneNumber = (rawPhone?: string) => {
    const value = (rawPhone || "").trim();
    if (!value) {
      return { countryCode: "+91", phone: "" };
    }

    const matchedCode = countryCodes.find((item) => value.startsWith(item.code));
    if (matchedCode) {
      return {
        countryCode: matchedCode.code,
        phone: value.slice(matchedCode.code.length).replace(/\D/g, ""),
      };
    }

    return {
      countryCode: "+91",
      phone: value.replace(/\D/g, ""),
    };
  };

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userStatus, setUserStatus] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: account.value,
  }));
  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: role.value,
  }));
  const countryCodeOptions = countryCodes.map((item) => ({
    value: item.code,
    label: `${item.code} (${item.country})`,
  }));

  // Permission Matrix States - Similar to AddRole
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]); // Base permissions from role
  const [additionalPermissions, setAdditionalPermissions] = useState<
    AdditionalPermission[]
  >([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const normalizedValue =
      name === "phoneNumber" ? value.replace(/\D/g, "").slice(0, 10) : value;

    if (name === "accountId") {
      const selectedAccountId = parseInt(normalizedValue);
      setFormData((prev) => ({
        ...prev,
        accountId: selectedAccountId,
        roleId: 0,
      }));

      setRolePermissions([]);
      setAdditionalPermissions([]);

      if (selectedAccountId > 0) {
        fetchRolesForAccount(selectedAccountId);
      } else {
        setRoles([]);
      }
    } else if (name === "roleId") {
      const selectedRoleId = parseInt(normalizedValue);
      setFormData((prev) => ({
        ...prev,
        roleId: selectedRoleId,
      }));

      if (selectedRoleId > 0 && formData.accountId > 0) {
        fetchRolePermissions(selectedRoleId, formData.accountId);
      } else {
        setRolePermissions([]);
        setAdditionalPermissions([]);
      }
    } else {
      if (name === "password") {
        setFormData((prev) => ({
          ...prev,
          [name]: normalizedValue,
        }));
        return;
      }
      setFormData((prev) => ({
        ...prev,
        [name]: normalizedValue,
      }));
    }
  };

  const handleAccountSelect = (selectedAccountId: number) => {
    setFormData((prev) => ({
      ...prev,
      accountId: selectedAccountId,
      roleId: 0,
    }));
    setRolePermissions([]);
    setAdditionalPermissions([]);

    if (selectedAccountId > 0) {
      fetchRolesForAccount(selectedAccountId);
      return;
    }
    setRoles([]);
  };

  const handleRoleSelect = (selectedRoleId: number) => {
    setFormData((prev) => ({
      ...prev,
      roleId: selectedRoleId,
    }));

    if (selectedRoleId > 0 && formData.accountId > 0) {
      fetchRolePermissions(selectedRoleId, formData.accountId);
      return;
    }
    setRolePermissions([]);
    setAdditionalPermissions([]);
  };

  // Fetch roles based on selected account - AddRole reference
  const fetchRolesForAccount = async (accountId: number) => {
    try {
      const response = await getAllRoles(accountId);
      if (response && response.statusCode === 200) {
        setRoles(response.data || []);
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      setRoles([]);
    }
  };

  // Fetch permissions for selected role - AddRole reference
  const fetchRolePermissions = async (roleId: number, accountId: number) => {
    try {
      setLoadingPermissions(true);
      const response = await getRoleById(roleId, accountId);

      if (response && response.statusCode === 200) {
        const roleData = response.data;

        // Set base permissions from role - AddRole reference
        if (roleData.rights && Array.isArray(roleData.rights)) {
          const permissions = roleData.rights.map((right: any) => ({
            formId: right.formId,
            formName: right.formName || `Form ${right.formId}`,
            moduleName: right.moduleName || "General",
            canRead: right.canRead || false,
            canWrite: right.canWrite || false,
            canDelete: right.canDelete || false,
            canExport: right.canExport || false,
          }));
          setRolePermissions(permissions);
        }
      }
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      toast.error(t("toast.rolePermissionsFailed"));
    } finally {
      setLoadingPermissions(false);
    }
  };

  // Toggle additional permission - only formId stored
  const toggleAdditionalPermission = (formId: number) => {
    setAdditionalPermissions((prev) => {
      const exists = prev.find((p) => p.formId === formId);

      if (exists) {
        return prev.filter((p) => p.formId !== formId);
      }

      return [
        ...prev,
        {
          accountId: formData.accountId, // 🔴 MUST
          formId,
          canRead: true,
          canWrite: true,
          canUpdate: true,
          canDelete: true,
          canExport: true,
          canAll: true,
        },
      ];
    });
  };

  // Check if permission is from role (cannot be unchecked)
  const isPermissionFromRole = (formId: number) => {
    return rolePermissions.some(
      (p) =>
        p.formId === formId &&
        (p.canRead || p.canWrite || p.canDelete || p.canExport),
    );
  };

  // Check if permission is additional (can be unchecked)
  const isAdditionalPermission = (formId: number) => {
    return additionalPermissions.some((p) => p.formId === formId);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error(t("toast.uploadValidImage"));
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(t("toast.uploadSize"));
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast.success(t("toast.avatarUploaded"));
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    toast.info(t("toast.avatarRemoved"));
  };

  const fetchUserData = async (userId: string) => {
    try {
      setFetchingData(true);
      const response = await getUserById(userId);

      if (response && response.statusCode === 200) {
        const userData = response.data;
        const parsedPhone = splitPhoneNumber(userData.mobileNo || "");

        setFormData({
          accountName: userData.firstName || "",
          accountCode: userData.lastName || "",
          userName: String(userData.userName || userData.username || ""),
          password: "",
          accountId: userData.accountId || 7, // Use from API or default to 7
          roleId: userData.roleId || 0,
          primaryDomain: "",
          fullName: `${userData.firstName} ${userData.lastName}`,
          emailAddress: userData.email || "",
          phoneNumber: parsedPhone.phone,
          location: "",
        });
        setPhoneCountryCode(parsedPhone.countryCode);

        setUserStatus(userData.status ?? true);
        setTwoFactorEnabled(userData.twoFactorEnabled ?? false);

        // Set additional permissions from user data
        if (Array.isArray(userData.additionalPermissions)) {
          const mapped: AdditionalPermission[] =
            userData.additionalPermissions.map((p: any) => ({
              accountId: userData.accountId,
              formId: p.formId,
              canRead: p.canRead ?? true,
              canWrite: p.canWrite ?? true,
              canUpdate: p.canUpdate ?? true,
              canDelete: p.canDelete ?? true,
              canExport: p.canExport ?? true,
              canAll: p.canAll ?? true,
            }));

          setAdditionalPermissions(mapped);
        }

        if (userData.profileImagePath) {
          const imageUrl = userData.profileImagePath.startsWith("http")
            ? userData.profileImagePath
            : `/proxy/${String(userData.profileImagePath).replace(/^\/+/, "")}`;
          setAvatarPreview(imageUrl);
        }

        // Load roles for the user's account
        if (userData.accountId) {
          await fetchRolesForAccount(userData.accountId);
        }

        // Load permissions for the user's role
        if (userData.roleId && userData.accountId) {
          await fetchRolePermissions(userData.roleId, userData.accountId);
        }

        setIsEditMode(true);
      } else {
        toast.error(response?.message || t("toast.fetchUserFailed"));
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      toast.error(t("toast.loadUserFailed"));
    } finally {
      setFetchingData(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.accountName ||
      !formData.accountCode ||
      !formData.emailAddress
    ) {
      toast.error(t("toast.fillRequired"));
      return;
    }

    if (!formData.accountId || formData.accountId === 0) {
      toast.error(t("toast.selectAccount"));
      return;
    }

    if (!formData.roleId || formData.roleId === 0) {
      toast.error(t("toast.selectRole"));
      return;
    }

    if (!isEditMode) {
      if (formData.password.length < 6) {
        toast.error(t("toast.passwordMin"));
        return;
      }
    }

    try {
      setLoading(true);
      const submitData = new FormData();

      if (isEditMode && id) {
        submitData.append("userId", id as string);
        submitData.append("Email", formData.emailAddress);
        submitData.append("FirstName", formData.accountName);
        submitData.append("LastName", formData.accountCode);
        submitData.append(
          "MobileNo",
          formData.phoneNumber ? `${phoneCountryCode}${formData.phoneNumber}` : "",
        );
        submitData.append("AccountId", formData.accountId.toString());
        submitData.append("RoleId", formData.roleId.toString());
        submitData.append("Status", userStatus.toString());
        submitData.append("TwoFactorEnabled", twoFactorEnabled.toString());

        // Add only additional permissions (formIds)
        if (additionalPermissions.length > 0) {
          submitData.append(
            "AdditionalPermissions",
            JSON.stringify(additionalPermissions),
          );
        }

        if (avatarFile) {
          submitData.append("ProfileImage", avatarFile);
        }
        const payload = {
          Email: formData.emailAddress,
          UserName: formData.userName,
          FirstName: formData.accountName,
          LastName: formData.accountCode,
          MobileNo: formData.phoneNumber
            ? `${phoneCountryCode}${formData.phoneNumber}`
            : "",
          AccountId: formData.accountId,
          RoleId: formData.roleId,
          Status: userStatus,
          TwoFactorEnabled: twoFactorEnabled,
          AdditionalPermissions: additionalPermissions, // 🔥 full array
          ProfileImage: avatarFile || null,
        };

        const response = await updateUser(id as string, payload);

        // const response = await updateUser(id, submitData);
        if (response.statusCode === 200) {
          toast.success(response.message || t("toast.updated"));
          setTimeout(() => router.push("/users"), 1000);
        } else {
          toast.error(response.message || t("toast.updateFailed"));
        }
      } else {
        // CREATE USER - Pass plain object instead of FormData
        const payload = {
          Email: formData.emailAddress,
          UserName: formData.userName,
          Password: formData.password,
          FirstName: formData.accountName,
          LastName: formData.accountCode,
          MobileNo: formData.phoneNumber
            ? `${phoneCountryCode}${formData.phoneNumber}`
            : "",
          AccountId: formData.accountId,
          RoleId: formData.roleId,
          Status: userStatus,
          TwoFactorEnabled: twoFactorEnabled,
          AdditionalPermissions: additionalPermissions, // Pass the array directly
          ProfileImage: avatarFile || null,
        };

        const response = await createUser(payload);
        if (response.statusCode === 200) {
          toast.success(response.message || t("toast.created"));
          setTimeout(() => router.push("/users"), 1000);
        } else {
          toast.error(response.message || t("toast.createFailed"));
        }
      }
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error(
        isEditMode ? t("toast.updateFailed") : t("toast.createFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  async function fetchAllAccounts() {
    try {
      const response = await getAllAccounts();
      if (response && response.statusCode === 200) {
        setAccounts(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error(t("toast.loadAccountsFailed"));
    }
  }

  const handleResetPassword = async () => {
    if (!id || String(id) === "0") {
      toast.error(t("toast.userNotFound") || "User not found");
      return;
    }

    // if (!window.confirm(t("toast.resetPasswordConfirm") || "Are you sure you want to send a password reset link to this user?")) {
    //   return;
    // }

    try {
      setResetPasswordLoading(true);
      const response = await resetPassword(id as string);

      if (response.statusCode === 200) {
        toast.success(response.message || "Password reset link sent successfully!");
      } else {
        toast.error(response.message || "Failed to send reset password link");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("An error occurred while sending the reset link");
    } finally {
      setResetPasswordLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchAllAccounts();

      // Load roles for default accountId = 7
      await fetchRolesForAccount(7);

      if (id && String(id) !== "0") {
        await fetchUserData(id as string);
      }
    };
    loadData();
  }, [id]);

  const tabs = [
    { id: "profile" as TabType, label: t("tabs.profile") },
    { id: "access" as TabType, label: t("tabs.access") },
    { id: "security" as TabType, label: t("tabs.security") },
  ];

  return (
    <div className={`${isDark ? "dark" : ""}  sm:`}>
      <div
        className={`min-h-screen ${isDark ? "bg-background" : "bg-gray-50"} p-3 sm:p-4 md:p-6`}
      >
        <ActionLoader
          isVisible={fetchingData || loading}
          text={
            fetchingData
              ? "Loading user details..."
              : isCreateMode
                ? "Creating user..."
                : "Updating user..."
          }
        />
        <div className="max-w-7xl mx-auto mb-4 sm:mb-6">
          <PageHeader
            title={isCreateMode ? t("title.create") : t("title.edit")}
            breadcrumbs={[
              { label: tList("breadcrumbs.users"), href: "/users" },
              { label: tList("breadcrumbs.current"), href: "/users" },
              { label: isCreateMode ? t("title.create") : t("title.edit") },
            ]}
            showButton
            buttonText={
              loading
                ? t("buttons.saving")
                : isCreateMode
                  ? t("buttons.create")
                  : t("buttons.update")
            }
            onButtonClick={handleSubmit}
            showExportButton={false}
          showFilterButton={false}
          showBulkUpload={false}
          />
        </div>

        <div
          className="max-w-7xl mx-auto"
        >
          <div
          className={`border-b ${isDark ? "border-gray-700" : "border-gray-200"} mb-4 sm:mb-6`}
          >
            <div className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2`}
                  style={{
                    borderBottomColor:
                      activeTab === tab.id ? selectedColor : "transparent",
                    color:
                      activeTab === tab.id
                        ? selectedColor
                        : isDark
                          ? "#9CA3AF"
                          : "#6B7280",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            {activeTab === "profile" && (
              <Card isDark={isDark}>
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <User
                    className={`w-4 h-4 sm:w-5 sm:h-5`}
                    style={{ color: selectedColor }}
                  />
                  <h2
                    className={`text-lg sm:text-xl font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}
                  >
                    {t("sections.personalInfo")}
                  </h2>
                </div>
                <p
                  className={`text-xs sm:text-sm mb-4 sm:mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  {t("sections.personalInfoSubtitle")}
                </p>

                <div className="mb-6">
                  <label
                    className={`block text-xs sm:text-sm font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    {t("fields.profilePicture")}
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center overflow-hidden ${
                          isDark
                            ? "bg-gray-800 border-2 border-gray-700"
                            : "bg-gray-100 border-2 border-gray-300"
                        }`}
                      >
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User
                            className={`w-10 h-10 sm:w-12 sm:h-12 ${isDark ? "text-gray-600" : "text-gray-400"}`}
                          />
                        )}
                      </div>
                      {avatarPreview && (
                        <button
                          onClick={handleRemoveAvatar}
                          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor="avatar-upload"
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
                          isDark
                            ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                        }`}
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Change Avatar</span>
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <p
                        className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                      >
                        JPG, PNG, GIF or WebP. Max size 5MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="accountName"
                      value={formData.accountName}
                      onChange={handleInputChange}
                      placeholder="Jane"
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="accountCode"
                      value={formData.accountCode}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="emailAddress"
                      value={formData.emailAddress}
                      onChange={handleInputChange}
                      placeholder="jane@company.com"
                      disabled={isEditMode}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                      } ${isEditMode ? "opacity-60 cursor-not-allowed" : ""} focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                    {isEditMode && (
                      <p
                        className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                      >
                        Email cannot be changed after user creation
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="userName"
                      value={formData.userName}
                      onChange={handleInputChange}
                      placeholder="Enter username"
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={isEditMode ? "" : formData.password}
                      onChange={handleInputChange}
                      placeholder={
                        isEditMode ? "******" : "Enter minimum 6 character password"
                      }
                      disabled={isEditMode}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                      } ${isEditMode ? "opacity-60 cursor-not-allowed" : ""} focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Phone Number
                    </label>
                    <div className="flex gap-2">
                      <div className="w-48 shrink-0">
                        <SearchableDropdown
                          options={countryCodeOptions}
                          value={
                            countryCodeOptions.find(
                              (option) => option.value === phoneCountryCode,
                            ) || null
                          }
                          onChange={(option) =>
                            setPhoneCountryCode(String(option?.value || "+91"))
                          }
                          isDark={isDark}
                          noOptionsMessage="No code found"
                        />
                      </div>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="Phone Number"
                        maxLength={10}
                        className={`flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border transition-colors ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                        } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                      />
                    </div>
                  </div>
                </div>
              </div>
              </Card>
            )}

            {activeTab === "access" && (
              <Card isDark={isDark}>
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Building2
                    className={`w-4 h-4 sm:w-5 sm:h-5`}
                    style={{ color: selectedColor }}
                  />
                  <h2
                    className={`text-lg sm:text-xl font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}
                  >
                    {t("sections.accessRoles")}
                  </h2>
                </div>
                <p
                  className={`text-xs sm:text-sm mb-4 sm:mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  {t("sections.accessRolesSubtitle")}
                </p>

                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.accountAssociation")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <SearchableDropdown
                      options={accountOptions}
                      value={
                        accountOptions.find(
                          (option) => Number(option.value) === formData.accountId,
                        ) || null
                      }
                      onChange={(option) =>
                        handleAccountSelect(Number(option?.value || 0))
                      }
                      placeholder={t("fields.selectAccount")}
                      isDark={isDark}
                      noOptionsMessage={t("fields.selectAccount")}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.roleAssignment")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <SearchableDropdown
                      options={roleOptions}
                      value={
                        roleOptions.find(
                          (option) => Number(option.value) === formData.roleId,
                        ) || null
                      }
                      onChange={(option) =>
                        handleRoleSelect(Number(option?.value || 0))
                      }
                      isDisabled={!formData.accountId || formData.accountId === 0}
                      placeholder={t("fields.selectRole")}
                      isDark={isDark}
                      noOptionsMessage={t("fields.selectRole")}
                    />
                  </div>

                  {/* Permission Matrix - AddRole Style */}
                  {formData.roleId > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Lock
                          className={`w-5 h-5`}
                          style={{ color: selectedColor }}
                        />
                        <h3
                          className={`text-base font-semibold ${isDark ? "text-foreground" : "text-gray-900"}`}
                        >
                          {t("permission.title")}
                        </h3>
                        {loadingPermissions && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {t("loading.permissions")}
                          </div>
                        )}
                      </div>

                      <p
                        className={`text-xs mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                      >
                        {t("permission.subtitle")}
                      </p>

                      {rolePermissions.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr
                                className={`border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
                              >
                                <th
                                  className={`text-left py-3 px-4 font-semibold text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                  {t("permission.resource")}
                                </th>
                                <th
                                  className={`text-center py-3 px-4 font-semibold text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                  {t("permission.read")}
                                </th>
                                <th
                                  className={`text-center py-3 px-4 font-semibold text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                  {t("permission.write")}
                                </th>
                                <th
                                  className={`text-center py-3 px-4 font-semibold text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                  {t("permission.delete")}
                                </th>
                                <th
                                  className={`text-center py-3 px-4 font-semibold text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                  {t("permission.export")}
                                </th>
                                <th
                                  className={`text-center py-3 px-4 font-semibold text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                  {t("permission.additional")}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {rolePermissions.map((permission) => {
                                const isFromRole = isPermissionFromRole(
                                  permission.formId,
                                );
                                const isAdditional = isAdditionalPermission(
                                  permission.formId,
                                );

                                return (
                                  <tr
                                    key={permission.formId}
                                    className={`border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
                                  >
                                    <td
                                      className={`py-4 px-4 ${isDark ? "text-foreground" : "text-gray-900"}`}
                                    >
                                      <div className="font-medium">
                                        {permission.formName}
                                      </div>
                                      <div
                                        className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                                      >
                                        {permission.moduleName}
                                      </div>
                                    </td>
                                    <td className="text-center py-4 px-4">
                                      <input
                                        type="checkbox"
                                        checked={permission.canRead}
                                        disabled
                                        className="w-4 h-4 rounded border-gray-300 opacity-50 cursor-not-allowed"
                                        style={{ accentColor: selectedColor }}
                                      />
                                    </td>
                                    <td className="text-center py-4 px-4">
                                      <input
                                        type="checkbox"
                                        checked={permission.canWrite}
                                        disabled
                                        className="w-4 h-4 rounded border-gray-300 opacity-50 cursor-not-allowed"
                                        style={{ accentColor: selectedColor }}
                                      />
                                    </td>
                                    <td className="text-center py-4 px-4">
                                      <input
                                        type="checkbox"
                                        checked={permission.canDelete}
                                        disabled
                                        className="w-4 h-4 rounded border-gray-300 opacity-50 cursor-not-allowed"
                                        style={{ accentColor: selectedColor }}
                                      />
                                    </td>
                                    <td className="text-center py-4 px-4">
                                      <input
                                        type="checkbox"
                                        checked={permission.canExport}
                                        disabled
                                        className="w-4 h-4 rounded border-gray-300 opacity-50 cursor-not-allowed"
                                        style={{ accentColor: selectedColor }}
                                      />
                                    </td>
                                    <td className="text-center py-4 px-4">
                                      <input
                                        type="checkbox"
                                        checked={isAdditional}
                                        disabled={isFromRole}
                                        onChange={() =>
                                          toggleAdditionalPermission(
                                            permission.formId,
                                          )
                                        }
                                        className="w-4 h-4 rounded border-gray-300 cursor-pointer disabled:opacity-50"
                                        style={{ accentColor: selectedColor }}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div
                          className={`text-center py-8 rounded-lg border ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-300 bg-gray-50"}`}
                        >
                          <p
                            className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                          >
                            {loadingPermissions
                              ? t("loading.permissions")
                              : t("permission.none")}
                          </p>
                        </div>
                      )}

                      <div
                        className={`mt-4 p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-blue-50"}`}
                      >
                        <p
                          className={`text-xs ${isDark ? "text-gray-400" : "text-gray-700"}`}
                        >
                          <strong>Note:</strong> {t("permission.note")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </Card>
            )}

            {activeTab === "security" && (
              <Card isDark={isDark}>
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Shield
                    className={`w-4 h-4 sm:w-5 sm:h-5`}
                    style={{ color: selectedColor }}
                  />
                  <h2
                    className={`text-lg sm:text-xl font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}
                  >
                    {t("sections.securitySettings")}
                  </h2>
                </div>
                <p
                  className={`text-xs sm:text-sm mb-4 sm:mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  {t("sections.securitySettingsSubtitle")}
                </p>

                <div className="space-y-4 sm:space-y-6">
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 sm:py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <div className="flex-1">
                      <h3
                        className={`text-sm sm:text-base font-medium mb-1 ${isDark ? "text-foreground" : "text-gray-900"}`}
                      >
                        {t("security.accountStatus")}
                      </h3>
                      <p
                        className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                      >
                        {t("security.accountStatusSubtitle")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs sm:text-sm font-medium px-2.5 sm:px-3 py-1 rounded-full"
                        style={{
                          backgroundColor: `${selectedColor}20`,
                          color: selectedColor,
                        }}
                      >
                        {userStatus
                          ? t("security.active")
                          : t("security.inactive")}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={userStatus}
                          onChange={(e) => setUserStatus(e.target.checked)}
                        />
                        <div
                          className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                          style={{
                            backgroundColor: userStatus
                              ? selectedColor
                              : isDark
                                ? "#374151"
                                : "#D1D5DB",
                          }}
                        ></div>
                      </label>
                    </div>
                  </div>

                  <div
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 sm:py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
                  >
                    <div className="flex-1">
                      <h3
                        className={`text-sm sm:text-base font-medium mb-1 ${isDark ? "text-foreground" : "text-gray-900"}`}
                      >
                        {t("security.mfa")}
                      </h3>
                      <p
                        className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                      >
                        {t("security.mfaSubtitle")}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={twoFactorEnabled}
                        onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                      />
                      <div
                        className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                        style={{
                          backgroundColor: twoFactorEnabled
                            ? selectedColor
                            : isDark
                              ? "#374151"
                              : "#D1D5DB",
                        }}
                      ></div>
                    </label>
                  </div>

                  {isEditMode && (
                    <div className="py-3 sm:py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <h3
                            className={`text-sm sm:text-base font-medium mb-1 ${isDark ? "text-foreground" : "text-gray-900"}`}
                          >
                            {t("security.passwordReset")}
                          </h3>
                          <p
                            className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                          >
                            {t("security.passwordResetSubtitle")}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleResetPassword()
                          }
                          className={`w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg font-medium transition-colors ${
                            isDark
                              ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                          }`}
                        >
                          {t("buttons.sendLink")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </Card>
            )}
          </div>

          <div
            id="form-footer-actions"
            className="form-footer-actions mt-4 sm:mt-6 flex justify-end"
          >
            <button
              onClick={() => router.push("/users")}
              className={`px-4 sm:px-6 py-2.5 rounded-lg font-medium transition-colors ${
                isDark
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              {t("buttons.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateUser;
