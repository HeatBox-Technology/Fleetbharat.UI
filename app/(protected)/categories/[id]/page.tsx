"use client";

import { Layers } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { CategoryFormData } from "@/interfaces/category.interface";
import {
  getCategoryById,
  saveCategory,
  updateCategory,
} from "@/services/categoryService";

const AddEditCategory: React.FC = () => {
  const { selectedColor } = useColor();
  const { isDark } = useTheme();
  const t = useTranslations("pages.categories.detail");
  const tList = useTranslations("pages.categories.list");
  const router = useRouter();
  const params = useParams();

  // Get ID from route params
  const categoryId = params?.id ? Number(params.id) : 0;
  const isEditMode = categoryId > 0;

  const [isActive, setIsActive] = useState(true);
  const [labelName, setLabelName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  // Fetch category data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      fetchCategoryData();
    }
  }, [categoryId]);

  const fetchCategoryData = async () => {
    try {
      setFetchingData(true);
      const response = await getCategoryById(categoryId);

      if (response.success && response.data) {
        const category = Array.isArray(response.data)
          ? response.data[0]
          : response.data;

        setLabelName(category.labelName || "");
        setDescription(category.description || "");
        setIsActive(category.isActive ?? true);
      } else {
        toast.error(t("toast.fetchFailed"));
        router.back();
      }
    } catch (error) {
      console.error("Error fetching category:", error);
      toast.error(t("toast.fetchError"));
      router.back();
    } finally {
      setFetchingData(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!labelName.trim()) {
      toast.error(t("toast.labelRequired"));
      return;
    }

    const payload: CategoryFormData = {
      labelName: labelName.trim(),
      description: description.trim(),
      isActive,
    };

    try {
      setLoading(true);
      let response;

      if (isEditMode) {
        // Update existing category
        response = await updateCategory(payload, categoryId);
      } else {
        // Create new category
        response = await saveCategory(payload);
      }

      if (response.success) {
        toast.success(isEditMode ? t("toast.updated") : t("toast.created"));
        router.push("/categories");
      } else {
        toast.error(t("toast.saveFailed", { message: response.message }));
      }
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error(t("toast.saveError"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (fetchingData) {
    return (
      <div className={`${isDark ? "dark" : ""} `}>
        <ActionLoader isVisible={true} text="Loading category details..." />
        <div className="min-h-screen bg-background" />
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader
        isVisible={loading}
        text={isEditMode ? "Updating category..." : "Creating category..."}
      />
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-3 sm:p-4 md:p-6`}
      >
        <PageHeader
          title={isEditMode ? t("title.edit") : t("title.create")}
          subtitle={
            isEditMode ? t("section.subtitleEdit") : t("section.subtitleCreate")
          }
          breadcrumbs={[
            { label: tList("breadcrumbs.accounts") },
            { label: tList("breadcrumbs.current"), href: "/categories" },
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
           showExportButton={false}
            showFilterButton={false}
            showBulkUpload={false}
        />

        {/* Form Card */}
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
            {/* Section Header */}
            <div className="flex items-start gap-3 mb-6">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${selectedColor}20` }}
              >
                <Layers className="w-5 h-5" style={{ color: selectedColor }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">
                  {t("section.title")}
                </h2>
                <p className="text-sm text-foreground opacity-60">
                  {isEditMode
                    ? t("section.subtitleEdit")
                    : t("section.subtitleCreate")}
                </p>
              </div>
            </div>

            {/* Label Name Field */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t("fields.labelName")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={t("fields.labelPlaceholder")}
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                onFocus={(e) => (e.target.style.borderColor = selectedColor)}
                onBlur={(e) => (e.target.style.borderColor = "")}
                disabled={loading}
              />
            </div>

            {/* Description Field */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t("fields.description")}
              </label>
              <textarea
                placeholder={t("fields.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className={`w-full px-4 py-2.5 rounded-lg border transition-colors resize-none ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                onFocus={(e) => (e.target.style.borderColor = selectedColor)}
                onBlur={(e) => (e.target.style.borderColor = "")}
                disabled={loading}
              />
            </div>

            {/* Category Status Toggle */}
            <div className="bg-background rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">
                    {t("status.title")}
                  </h3>
                  <p className="text-sm text-foreground opacity-60">
                    {t("status.subtitle")}
                  </p>
                </div>
                <button
                  onClick={() => setIsActive(!isActive)}
                  disabled={loading}
                  className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
                  style={{
                    backgroundColor: isActive ? selectedColor : "#cbd5e1",
                  }}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      isActive ? "translate-x-8" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
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
  );
};

export default AddEditCategory;
