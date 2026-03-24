"use client";

import { Lock, Shield } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Card } from "@/components/CommonCard";
import PageHeader from "@/components/PageHeader";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { Permission, RoleFormData } from "@/interfaces/permission.interface";
import { getAllAccounts } from "@/services/commonServie";
import { getAllForms } from "@/services/formService";
import {
  createRole,
  getRoleById,
  updateRights,
  updateRole,
} from "@/services/rolesService";

const AddRole: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const t = useTranslations("pages.rolesPermissions.detail");
  const tList = useTranslations("pages.rolesPermissions.list");
  const router = useRouter();
  const params = useParams();
  const roleId = params?.id;
  const roleIdNumber = Number(roleId || 0);
  const isCreateMode = String(roleId || "0") === "0";

  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<RoleFormData>({
    account: "",
    roleName: "",
    description: "",
    permissions: [],
  });

  const [accounts, setAccounts] = useState([]);

  const getStoredAccountId = () => {
    if (typeof window === "undefined") return "";
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userAccountId = String(user?.accountId || "").trim();
      if (userAccountId) return userAccountId;
    } catch {
      // Ignore and try direct accountId key fallback
    }
    return String(localStorage.getItem("accountId") || "").trim();
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Updated: Handle row-wise "All" checkbox
  const handlePermissionChange = (index: number, field: keyof Permission) => {
    if (!["read", "write", "update", "delete", "export", "all"].includes(field))
      return;

    setFormData((prev) => {
      const updatedPermissions = prev.permissions.map((perm, i) => {
        if (i === index) {
          // If "all" checkbox is clicked, toggle all other permissions for this row
          if (field === "all") {
            const newAllValue = !perm.all;
            return {
              ...perm,
              all: newAllValue,
              read: newAllValue,
              write: newAllValue,
              update: newAllValue,
              delete: newAllValue,
              export: newAllValue,
            };
          } else {
            // If any individual permission is clicked
            const updatedPerm = { ...perm, [field]: !perm[field] };

            // Auto-update "all" checkbox based on other permissions
            const allPermissionsTrue =
              updatedPerm.read &&
              updatedPerm.write &&
              updatedPerm.update &&
              updatedPerm.delete &&
              updatedPerm.export;

            return {
              ...updatedPerm,
              all: allPermissionsTrue,
            };
          }
        }
        return perm;
      });

      return {
        ...prev,
        permissions: updatedPermissions,
      };
    });
  };

  // Updated: Handle column header checkboxes
  const handleSelectAll = (field: keyof Permission) => {
    if (
      field === "read" ||
      field === "write" ||
      field === "update" ||
      field === "delete" ||
      field === "export" ||
      field === "all"
    ) {
      const allChecked = formData.permissions.every((p) => p[field]);

      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.map((p) => {
          // If "all" column header is clicked
          if (field === "all") {
            return {
              ...p,
              all: !allChecked,
              read: !allChecked,
              write: !allChecked,
              update: !allChecked,
              delete: !allChecked,
              export: !allChecked,
            };
          } else {
            // For other column headers, just toggle that field
            const updatedPerm = {
              ...p,
              [field]: !allChecked,
            };

            // Auto-update "all" checkbox based on other permissions
            const allPermissionsTrue =
              updatedPerm.read &&
              updatedPerm.write &&
              updatedPerm.update &&
              updatedPerm.delete &&
              updatedPerm.export;

            return {
              ...updatedPerm,
              all: allPermissionsTrue,
            };
          }
        }),
      }));
    }
  };

  // Helper function to check if all permissions for a field are checked
  const areAllChecked = (field: keyof Permission): boolean => {
    if (
      field === "read" ||
      field === "write" ||
      field === "update" ||
      field === "delete" ||
      field === "export" ||
      field === "all"
    ) {
      return (
        formData.permissions.length > 0 &&
        formData.permissions.every((p) => p[field])
      );
    }
    return false;
  };

  const fetchRoleData = async (id: string) => {
    try {
      setLoading(true);

      // Get accountId from localStorage
      const accountId = getStoredAccountId();
      if (accountId) {
        const response = await getRoleById(id, accountId);
        if (response && response.statusCode === 200) {
          const roleData = response.data;

          // Set form data from API response
          setFormData((prev) => ({
            ...prev,
            account: roleData.accountId?.toString() || accountId,
            roleName: roleData.roleName || "",
            description: roleData.description || "",
          }));

          // Merge existing permissions with API rights
          setFormData((prev) => {
            const updatedPermissions = prev.permissions.map((perm) => {
              const right = roleData.rights?.find(
                (r: any) => r.formId === perm.formId,
              );

              if (right) {
                // Check if all permissions are true to set "all" flag
                const allPermissionsTrue =
                  right.canRead &&
                  right.canWrite &&
                  right.canUpdate &&
                  right.canDelete &&
                  right.canExport;

                return {
                  ...perm,
                  read: right.canRead || false,
                  write: right.canWrite || false,
                  update: right.canUpdate || false,
                  delete: right.canDelete || false,
                  export: right.canExport || false,
                  all: right.canAll || allPermissionsTrue,
                };
              }
              return perm;
            });

            return {
              ...prev,
              permissions: updatedPermissions,
            };
          });

          setIsEditMode(true);
        } else {
          toast.error(response?.message || t("toast.fetchRoleFailed"));
        }
      }
    } catch (error) {
      console.error("Error fetching role:", error);
      toast.error(t("toast.loadRoleFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const trimmedRoleName = formData.roleName.trim();
    const hasAtLeastOnePermission = formData.permissions.some(
      (permission) =>
        permission.read ||
        permission.write ||
        permission.update ||
        permission.delete ||
        permission.export ||
        permission.all,
    );

    if (!formData.account || !trimmedRoleName) {
      toast.error(t("toast.fillRequired"));
      return;
    }

    if (!hasAtLeastOnePermission) {
      toast.error("At least one permission is required.");
      return;
    }

    try {
      setLoading(true);

      // Prepare rights payload
      const rightsPayload = formData.permissions.map((p) => ({
        formId: p.formId,
        canRead: p.read,
        canWrite: p.write,
        canUpdate: p.update,
        canDelete: p.delete,
        canExport: p.export,
        canAll: p.all,
      }));

      let response;
      if (isEditMode && roleId) {
        // Update existing role - role info payload (without rights)
        const rolePayload = {
          accountId: Number(formData.account),
          roleName: trimmedRoleName,
          description: formData.description,
          roleCode: trimmedRoleName.toUpperCase().replace(/\s+/g, "_"),
          isActive: true,
        };

        // Update role basic info
        response = await updateRole(roleId, rolePayload);

        if (response.statusCode === 200) {
          // Update rights separately
          const rightsResponse = await updateRights(roleId, rightsPayload);

          if (rightsResponse.statusCode === 200) {
            toast.success(t("toast.updatedSuccess"));
            router.push("/users/roles-permissions");
          } else {
            toast.error(
              rightsResponse?.message || t("toast.updatePermissionsFailed"),
            );
          }
        } else {
          toast.error(response?.message || t("toast.updateRoleFailed"));
        }
      } else {
        // Create new role - include rights in payload
        const payload = {
          accountId: Number(formData.account),
          roleName: trimmedRoleName,
          description: formData.description,
          roleCode: trimmedRoleName.toUpperCase().replace(/\s+/g, "_"),
          isActive: true,
          rights: rightsPayload,
        };

        response = await createRole(payload);

        if (response.statusCode === 200) {
          toast.success(response?.message || t("toast.createdSuccess"));
          router.push("/users/roles-permissions");
        } else {
          toast.error(response?.message || t("toast.createFailed"));
        }
      }
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} role:`,
        error,
      );
      toast.error(t("toast.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  async function fetchAllAcounts() {
    const response = await getAllAccounts();
    if (response && response.statusCode === 200) {
      setAccounts(response.data);
      if (isCreateMode) {
        const defaultAccountId = getStoredAccountId();
        if (defaultAccountId) {
          setFormData((prev) => ({
            ...prev,
            account: prev.account || defaultAccountId,
          }));
        }
      }
    }
  }

  async function fetchAllAForms() {
    try {
      const response = await getAllForms(0, 0);

      if (response && response.statusCode === 200) {
        // Transform API data into permissions format
        const permissionsFromApi = response.data.items.map((item: any) => ({
          formId: item.formId,
          formCode: item.formCode,
          formName: item.formName,
          moduleName: item.moduleName,
          pageUrl: item.pageUrl,
          isActive: item.isActive,
          resource: item.formName,
          read: false,
          write: false,
          update: false,
          delete: false,
          export: false,
          all: false,
        }));

        // Update formData state
        setFormData((prev) => ({
          ...prev,
          permissions: permissionsFromApi,
        }));

        // If in edit mode, fetch role data after forms are loaded
        if (roleIdNumber > 0) {
          await fetchRoleData(roleId as string);
        }
      } else {
        toast.error(t("toast.fetchFormsFailed"));
      }
    } catch (error) {
      console.error("Error fetching forms:", error);
      toast.error(t("toast.fetchFormsError"));
    }
  }

  useEffect(() => {
    fetchAllAcounts();
    fetchAllAForms();
  }, []);

  if (loading && isEditMode && formData.permissions.length === 0) {
    return (
      <div className={`${isDark ? "dark" : ""} `}>
        <div
          className={`min-h-screen ${isDark ? "bg-background" : "bg-gray-50"} p-6 flex items-center justify-center`}
        >
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
              style={{ borderColor: selectedColor }}
            ></div>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              {t("loading")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} `}>
      <div
        className={`min-h-screen ${isDark ? "bg-background" : "bg-gray-50"} p-6`}
      >
        <div className="max-w-7xl mx-auto mb-6">
          <PageHeader
            title={isCreateMode ? t("title.create") : t("title.edit")}
            breadcrumbs={[
              { label: tList("breadcrumbs.users") },
              {
                label: tList("breadcrumbs.current"),
                href: "/users/roles-permissions",
              },
              { label: isCreateMode ? t("title.create") : t("title.edit") },
            ]}
            showButton
            buttonText={
              loading
                ? isCreateMode
                  ? t("buttons.saving")
                  : t("buttons.updating")
                : isCreateMode
                  ? t("buttons.saveRole")
                  : t("buttons.updateRole")
            }
            onButtonClick={handleSubmit}
          />
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Role Information Card */}
          <Card isDark={isDark}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield
                  className={`w-5 h-5`}
                  style={{ color: selectedColor }}
                />
                <h2
                  className={`text-xl font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}
                >
                  {t("sections.roleInformation")}
                </h2>
              </div>
              <p
                className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                {t("sections.roleInformationSubtitle")}
              </p>

              <div className="grid grid-cols-1 gap-6">
                {/* Account */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    {t("fields.account")}
                  </label>
                  <select
                    name="account"
                    value={formData.account}
                    onChange={handleInputChange}
                    required
                    disabled={isEditMode}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                        : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                      isEditMode ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    <option value="">{t("fields.selectAccount")}</option>
                    {accounts &&
                      accounts.map((account: { id: number; value: string }) => (
                        <option key={account.id} value={account.id}>
                          {account.value}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Role Name */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    {t("fields.roleName")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="roleName"
                    value={formData.roleName}
                    required
                    onChange={handleInputChange}
                    placeholder={t("fields.roleNamePlaceholder")}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500 focus:border-purple-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    {t("fields.description")}
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder={t("fields.descriptionPlaceholder")}
                    rows={3}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors resize-none ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500 focus:border-purple-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Permission Matrix Card */}
          <Card isDark={isDark}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Lock className={`w-5 h-5`} style={{ color: selectedColor }} />
                <h2
                  className={`text-xl font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}
                >
                  {t("sections.permissionMatrix")}
                </h2>
              </div>
              <p
                className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                {t("sections.permissionMatrixSubtitle")}
              </p>

              {/* Permission Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      className={`border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
                    >
                      <th
                        className={`text-left py-3 px-4 font-semibold text-sm ${
                          isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {t("permission.resource")}
                      </th>
                      <th className="text-center py-3 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`font-semibold text-sm ${
                              isDark ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {t("permission.read")}
                          </span>
                          <input
                            type="checkbox"
                            checked={areAllChecked("read")}
                            onChange={() => handleSelectAll("read")}
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{ accentColor: selectedColor }}
                          />
                        </div>
                      </th>
                      <th className="text-center py-3 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`font-semibold text-sm ${
                              isDark ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {t("permission.write")}
                          </span>
                          <input
                            type="checkbox"
                            checked={areAllChecked("write")}
                            onChange={() => handleSelectAll("write")}
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{ accentColor: selectedColor }}
                          />
                        </div>
                      </th>
                      <th className="text-center py-3 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`font-semibold text-sm ${
                              isDark ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {t("permission.update")}
                          </span>
                          <input
                            type="checkbox"
                            checked={areAllChecked("update")}
                            onChange={() => handleSelectAll("update")}
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{ accentColor: selectedColor }}
                          />
                        </div>
                      </th>
                      <th className="text-center py-3 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`font-semibold text-sm ${
                              isDark ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {t("permission.delete")}
                          </span>
                          <input
                            type="checkbox"
                            checked={areAllChecked("delete")}
                            onChange={() => handleSelectAll("delete")}
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{ accentColor: selectedColor }}
                          />
                        </div>
                      </th>
                      <th className="text-center py-3 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`font-semibold text-sm ${
                              isDark ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {t("permission.export")}
                          </span>
                          <input
                            type="checkbox"
                            checked={areAllChecked("export")}
                            onChange={() => handleSelectAll("export")}
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{ accentColor: selectedColor }}
                          />
                        </div>
                      </th>
                      <th className="text-center py-3 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`font-semibold text-sm ${
                              isDark ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {t("permission.all")}
                          </span>
                          <input
                            type="checkbox"
                            checked={areAllChecked("all")}
                            onChange={() => handleSelectAll("all")}
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{ accentColor: selectedColor }}
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.permissions.map((permission, index) => (
                      <tr
                        key={index}
                        className={`border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
                      >
                        <td
                          className={`py-4 px-4 font-medium ${
                            isDark ? "text-foreground" : "text-gray-900"
                          }`}
                        >
                          {permission.resource}
                        </td>
                        <td className="text-center py-4 px-4">
                          <input
                            type="checkbox"
                            checked={permission.read}
                            onChange={() =>
                              handlePermissionChange(index, "read")
                            }
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{ accentColor: selectedColor }}
                          />
                        </td>
                        <td className="text-center py-4 px-4">
                          <input
                            type="checkbox"
                            checked={permission.write}
                            onChange={() =>
                              handlePermissionChange(index, "write")
                            }
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{ accentColor: selectedColor }}
                          />
                        </td>
                        <td className="text-center py-4 px-4">
                          <input
                            type="checkbox"
                            checked={permission.update}
                            onChange={() =>
                              handlePermissionChange(index, "update")
                            }
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{ accentColor: selectedColor }}
                          />
                        </td>
                        <td className="text-center py-4 px-4">
                          <input
                            type="checkbox"
                            checked={permission.delete}
                            onChange={() =>
                              handlePermissionChange(index, "delete")
                            }
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{ accentColor: selectedColor }}
                          />
                        </td>
                        <td className="text-center py-4 px-4">
                          <input
                            type="checkbox"
                            checked={permission.export}
                            onChange={() =>
                              handlePermissionChange(index, "export")
                            }
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{ accentColor: selectedColor }}
                          />
                        </td>
                        <td className="text-center py-4 px-4">
                          <input
                            type="checkbox"
                            checked={permission.all}
                            onChange={() =>
                              handlePermissionChange(index, "all")
                            }
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{ accentColor: selectedColor }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <button
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
              onClick={() => router.back()}
              disabled={loading}
            >
              {t("buttons.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRole;
