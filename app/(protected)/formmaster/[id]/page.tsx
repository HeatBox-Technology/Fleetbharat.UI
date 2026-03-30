"use client";

import { FileText } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { FormMasterPayload } from "@/interfaces/form.interface";
import { createForm, getFormById, updateForm } from "@/services/formService";

const defaultFormData: FormMasterPayload = {
  formCode: "",
  formName: "",
  moduleName: "",
  pageUrl: "",
  iconName: "",
  sortOrder: 0,
  isMenu: true,
  isBulk: true,
  isVisible: true,
  isActive: true,
  formModuleId: 0,
  filterConfigJson: "",
};

const AddEditFormMasterPage: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const t = useTranslations("pages.formmaster.detail");
  const tList = useTranslations("pages.formmaster.list");
  const router = useRouter();
  const params = useParams();
  const formId = Number(params?.id || 0);
  const isEditMode = formId > 0;

  const [formData, setFormData] = useState<FormMasterPayload>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  const fetchFormById = async () => {
    try {
      setFetchingData(true);
      const response = await getFormById(formId);
      if (response?.success && response?.data) {
        const data = response.data;
        setFormData({
          formCode: data.formCode || "",
          formName: data.formName || "",
          moduleName: data.moduleName || "",
          pageUrl: data.pageUrl || "",
          iconName: data.iconName || "",
          sortOrder: Number(data.sortOrder || 0),
          isMenu: data.isMenu ?? true,
          isBulk: data.isBulk ?? true,
          isVisible: data.isVisible ?? true,
          isActive: data.isActive ?? true,
          formModuleId: Number(data.formModuleId || 0),
          filterConfigJson: String(data.filterConfigJson || ""),
        });
      } else {
        toast.error(response?.message || t("toast.fetchFailed"));
        router.push("/formmaster");
      }
    } catch (error) {
      toast.error(t("toast.fetchDetailsFailed"));
      router.push("/formmaster");
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    if (isEditMode) {
      fetchFormById();
    }
  }, [formId, isEditMode, t]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const target = e.target;
    const { name, value } = target;

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "sortOrder" || name === "formModuleId"
          ? Number(value || 0)
          : value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.formCode.trim()) {
      toast.error(t("toast.formCodeRequired"));
      return;
    }
    if (!formData.formName.trim()) {
      toast.error(t("toast.formNameRequired"));
      return;
    }
    if (!formData.moduleName.trim()) {
      toast.error(t("toast.moduleNameRequired"));
      return;
    }
    if (!formData.pageUrl.trim()) {
      toast.error(t("toast.pageUrlRequired"));
      return;
    }
    if (formData.filterConfigJson.trim()) {
      try {
        JSON.parse(formData.filterConfigJson);
      } catch {
        toast.error(t("toast.filterConfigInvalid"));
        return;
      }
    }

    const payload: FormMasterPayload = {
      ...formData,
      formCode: formData.formCode.trim(),
      formName: formData.formName.trim(),
      moduleName: formData.moduleName.trim(),
      pageUrl: formData.pageUrl.trim(),
      iconName: formData.iconName.trim(),
      sortOrder: Number(formData.sortOrder) || 0,
      formModuleId: Number(formData.formModuleId) || 0,
      filterConfigJson: formData.filterConfigJson.trim(),
    };

    try {
      setLoading(true);
      const response = isEditMode
        ? await updateForm(formId, payload)
        : await createForm(payload);

      if (response?.success || response?.statusCode === 200) {
        toast.success(
          response?.message ||
            (isEditMode ? t("toast.updated") : t("toast.created")),
        );
        router.push("/formmaster");
      } else {
        toast.error(response?.message || t("toast.saveFailed"));
      }
    } catch (error) {
      toast.error(t("toast.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className={`${isDark ? "dark" : ""}`}>
        <ActionLoader isVisible={true} text="Loading form details..." />
        <div className="min-h-screen bg-background" />
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader
        isVisible={loading}
        text={isEditMode ? "Updating form..." : "Creating form..."}
      />
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-3 sm:p-4 md:p-6`}
      >
        <div className="w-full">
          <PageHeader
            title={isEditMode ? t("title.edit") : t("title.create")}
            subtitle={t("section.subtitle")}
            breadcrumbs={[
              { label: tList("breadcrumbs.configurations") },
              { label: tList("breadcrumbs.current"), href: "/formmaster" },
              { label: isEditMode ? t("title.edit") : t("title.create") },
            ]}
            showButton
            buttonText={
              loading
                ? isEditMode
                  ? t("buttons.updating")
                  : t("buttons.creating")
                : isEditMode
                  ? t("buttons.update")
                  : t("buttons.create")
            }
            onButtonClick={handleSubmit}
          />

          <div
            className={`rounded-2xl shadow-lg border-t-4 overflow-hidden ${
              isDark
                ? "bg-card border border-gray-800"
                : "bg-white border border-gray-200"
            }`}
            style={{ borderTopColor: selectedColor }}
          >
            <div
              className={`p-4 sm:p-6 md:p-8 ${isDark ? "bg-card" : "bg-white"}`}
            >
              <div className="flex items-start gap-3 mb-6">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${selectedColor}20` }}
                >
                  <FileText
                    className="w-5 h-5"
                    style={{ color: selectedColor }}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {t("section.title")}
                  </h2>
                  <p className="text-sm text-foreground opacity-60">
                    {t("section.subtitle")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.formCode")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="formCode"
                    value={formData.formCode}
                    onChange={handleInputChange}
                    placeholder={t("fields.formCodePlaceholder")}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.formName")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="formName"
                    value={formData.formName}
                    onChange={handleInputChange}
                    placeholder={t("fields.formNamePlaceholder")}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.moduleName")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="moduleName"
                    value={formData.moduleName}
                    onChange={handleInputChange}
                    placeholder={t("fields.moduleNamePlaceholder")}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.pageUrl")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pageUrl"
                    value={formData.pageUrl}
                    onChange={handleInputChange}
                    placeholder={t("fields.pageUrlPlaceholder")}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.iconName")}
                  </label>
                  <input
                    type="text"
                    name="iconName"
                    value={formData.iconName}
                    onChange={handleInputChange}
                    placeholder={t("fields.iconNamePlaceholder")}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.sortOrder")}
                  </label>
                  <input
                    type="number"
                    name="sortOrder"
                    value={formData.sortOrder}
                    onChange={handleInputChange}
                    placeholder={t("fields.sortOrderPlaceholder")}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.formModuleId")}
                  </label>
                  <input
                    type="number"
                    name="formModuleId"
                    value={formData.formModuleId}
                    onChange={handleInputChange}
                    placeholder={t("fields.formModuleIdPlaceholder")}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    disabled={loading}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.filterConfigJson")}
                  </label>
                  <textarea
                    name="filterConfigJson"
                    value={formData.filterConfigJson}
                    onChange={handleInputChange}
                    placeholder={t("fields.filterConfigJsonPlaceholder")}
                    rows={4}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors resize-none ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="bg-background rounded-lg p-6 mb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1">
                      {t("toggles.isMenu.title")}
                    </h3>
                    <p className="text-sm text-foreground opacity-60">
                      {t("toggles.isMenu.description")}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    name="isMenu"
                    checked={formData.isMenu}
                    onChange={handleInputChange}
                    className="w-5 h-5"
                    style={{ accentColor: selectedColor }}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1">
                      {t("toggles.isBulk.title")}
                    </h3>
                    <p className="text-sm text-foreground opacity-60">
                      {t("toggles.isBulk.description")}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    name="isBulk"
                    checked={formData.isBulk}
                    onChange={handleInputChange}
                    className="w-5 h-5"
                    style={{ accentColor: selectedColor }}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1">
                      {t("toggles.isVisible.title")}
                    </h3>
                    <p className="text-sm text-foreground opacity-60">
                      {t("toggles.isVisible.description")}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    name="isVisible"
                    checked={formData.isVisible}
                    onChange={handleInputChange}
                    className="w-5 h-5"
                    style={{ accentColor: selectedColor }}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1">
                      {t("toggles.isActive.title")}
                    </h3>
                    <p className="text-sm text-foreground opacity-60">
                      {t("toggles.isActive.description")}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="w-5 h-5"
                    style={{ accentColor: selectedColor }}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: selectedColor }}
                >
                  {loading
                    ? isEditMode
                      ? t("buttons.updating")
                      : t("buttons.creating")
                    : isEditMode
                      ? t("buttons.update")
                      : t("buttons.create")}
                </button>
                <button
                  onClick={() => router.push("/formmaster")}
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    isDark
                      ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                  }`}
                >
                  {t("buttons.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEditFormMasterPage;
