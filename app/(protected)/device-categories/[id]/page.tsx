"use client";

import { Card } from "@/components/CommonCard";
import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { getFormRightForPath } from "@/services/commonServie";
import { Layers } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface DeviceCategoryForm {
  name: string;
  code: string;
  protocol: string;
  description: string;
  isActive: boolean;
}

const STATIC_CATEGORY_MAP: Record<number, DeviceCategoryForm> = {
  1: {
    name: "GPS Tracker",
    code: "GPS",
    protocol: "TCP",
    description: "Standard GPS tracking hardware category.",
    isActive: true,
  },
  2: {
    name: "DMS Camera",
    code: "DMS",
    protocol: "HTTP",
    description: "Driver monitoring camera category.",
    isActive: true,
  },
  3: {
    name: "Temperature Sensor",
    code: "TEMP",
    protocol: "MQTT",
    description: "Temperature telemetry device category.",
    isActive: false,
  },
  4: {
    name: "Fuel Probe",
    code: "FUEL",
    protocol: "TCP",
    description: "Fuel level monitoring probe category.",
    isActive: true,
  },
};

const INITIAL_FORM: DeviceCategoryForm = {
  name: "",
  code: "",
  protocol: "TCP",
  description: "",
  isActive: true,
};

const AddEditDeviceCategoryPage: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();
  const t = useTranslations("pages.deviceCategories.detail");
  const tList = useTranslations("pages.deviceCategories.list");
  const params = useParams();

  const id = Number(params?.id || 0);
  const isEditMode = id > 0;
  const pageRight = getFormRightForPath("/device-categories");
  const canWrite = pageRight ? Boolean(pageRight.canWrite) : true;
  const canUpdate = pageRight ? Boolean(pageRight.canUpdate) : true;

  const [formData, setFormData] = useState<DeviceCategoryForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const protocolOptions = [
    { value: "TCP", label: "TCP" },
    { value: "HTTP", label: "HTTP" },
    { value: "MQTT", label: "MQTT" },
  ];

  useEffect(() => {
    if (!isEditMode) return;
    setFetchingData(true);
    const existing = STATIC_CATEGORY_MAP[id];
    if (!existing) {
      toast.error(t("toast.notFound"));
      router.push("/device-categories");
      setFetchingData(false);
      return;
    }
    setFormData(existing);
    setFetchingData(false);
  }, [id, isEditMode, router]);

  const hasAccess = isEditMode ? canUpdate : canWrite;

  const inputClass =
    "w-full px-3 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20";

  const labelClass = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`;

  const updateField = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(t("toast.nameRequired"));
      return;
    }
    if (!formData.code.trim()) {
      toast.error(t("toast.codeRequired"));
      return;
    }

    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 350));
      toast.success(
        isEditMode
          ? t("toast.updated")
          : t("toast.created"),
      );
      router.push("/device-categories");
    } finally {
      setLoading(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className={`${isDark ? "dark" : ""} mt-10`}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-foreground">
            {t("noPermission")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-3 sm:p-4 md:p-6`}
      >
        <ActionLoader
          isVisible={fetchingData || loading}
          text={
            fetchingData
              ? "Loading device category details..."
              : isEditMode
                ? "Updating device category..."
                : "Creating device category..."
          }
        />
        <PageHeader
          title={isEditMode ? t("title.edit") : t("title.create")}
          subtitle={isEditMode ? t("subtitle.edit") : t("subtitle.create")}
          breadcrumbs={[
            { label: tList("breadcrumbs.fleet") },
            { label: tList("breadcrumbs.current"), href: "/device-categories" },
            { label: isEditMode ? t("breadcrumbs.edit") : t("breadcrumbs.create") },
          ]}
          showButton={true}
          buttonText={
            loading
              ? t("buttons.saving")
              : isEditMode
                ? t("buttons.update")
                : t("buttons.create")
          }
          onButtonClick={handleSubmit}
          showWriteButton={hasAccess}
           showExportButton={false}
            showFilterButton={false}
            showBulkUpload={false}
        />

        <Card isDark={isDark}>
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-3 border-gray-200 dark:border-gray-700">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${selectedColor}20` }}
              >
                <Layers className="w-4 h-4" style={{ color: selectedColor }} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
                {t("section.title")}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  {t("fields.name")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={updateField}
                  placeholder={t("fields.namePlaceholder")}
                  className={`${inputClass} ${
                    isDark
                      ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  }`}
                  disabled={loading}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {t("fields.code")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={updateField}
                  placeholder={t("fields.codePlaceholder")}
                  className={`${inputClass} uppercase ${
                    isDark
                      ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  }`}
                  disabled={loading}
                />
              </div>

              <div>
                <label className={labelClass}>{t("fields.protocol")}</label>
                <SearchableDropdown
                  options={protocolOptions}
                  value={
                    protocolOptions.find(
                      (option) => option.value === formData.protocol,
                    ) || null
                  }
                  onChange={(option) =>
                    setFormData((prev) => ({
                      ...prev,
                      protocol: String(option?.value || prev.protocol),
                    }))
                  }
                  isDisabled={loading}
                  placeholder={t("fields.protocol")}
                  isDark={isDark}
                  noOptionsMessage="No protocol found"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>{t("fields.description")}</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={updateField}
                rows={4}
                placeholder={t("fields.descriptionPlaceholder")}
                className={`${inputClass} resize-none ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
                disabled={loading}
              />
            </div>

            <div
              className={`flex items-center justify-between rounded-xl border p-4 ${
                isDark
                  ? "border-gray-700 bg-gray-800/50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t("status.title")}
                </p>
                <p className="text-xs text-foreground/70">
                  {t("status.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))
                }
                disabled={loading}
                className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors"
                style={{
                  backgroundColor: formData.isActive ? selectedColor : "#94a3b8",
                }}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    formData.isActive ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div
              id="form-footer-actions"
              className="form-footer-actions flex justify-end"
            >
              <button
                type="button"
                onClick={() => router.push("/device-categories")}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
              >
                {t("buttons.cancel")}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AddEditDeviceCategoryPage;
