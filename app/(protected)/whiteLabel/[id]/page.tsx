"use client";

import { Globe, Palette } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { toast } from "react-toastify";
import PageHeader from "@/components/PageHeader";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import {
  WhiteLabelFormData,
  WhiteLabelUpdateData,
} from "@/interfaces/whitelabel.interface";
import { getAllAccounts } from "@/services/commonServie";
import {
  getWhiteLabelById,
  saveWhiteLabel,
  updateWhiteLabel,
  uploadWhiteLabelLogos,
} from "@/services/whitelabelService";

const resolveMediaUrl = (value?: string) => {
  const path = String(value || "").trim();
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const baseUrl = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
    /\/+$/,
    "",
  );
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

const DEFAULT_PRIMARY_HEX = "#4F46E5";
const DEFAULT_SECONDARY_HEX = "#10B981";

const normalizeHexColor = (value: unknown, fallback: string) => {
  const color = String(value || "").trim();
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color.toUpperCase() : fallback;
};

const hexToRgb = (hex: string) => {
  const safeHex = normalizeHexColor(hex, DEFAULT_PRIMARY_HEX);
  const bigint = parseInt(safeHex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const ProvisionBranding: React.FC = () => {
  const { selectedColor } = useColor();
  const { isDark } = useTheme();
  const t = useTranslations("pages.whiteLabel.detail");
  const tList = useTranslations("pages.whiteLabel.list");
  const router = useRouter();
  const params = useParams();
  const whiteLabelId = Number(params?.id || 0);
  const isEditMode = whiteLabelId > 0;

  const [formData, setFormData] = useState({
    accountId: 0,
    customEntryFqdn: "",
    brandName: "",
    logoUrl: "",
    logoPath: "",
    primaryLogoPath: "",
    primaryLogoUrl: "",
    appLogoPath: "",
    appLogoUrl: "",
    mobileLogoPath: "",
    mobileLogoUrl: "",
    faviconPath: "",
    faviconUrl: "",
    logoDarkPath: "",
    logoDarkUrl: "",
    logoLightPath: "",
    logoLightUrl: "",
    primaryColorHex: DEFAULT_PRIMARY_HEX,
    secondaryColorHex: DEFAULT_SECONDARY_HEX,
    isActive: true,
  });
  const [logoFiles, setLogoFiles] = useState<{
    primaryLogo: File | null;
    appLogo: File | null;
    mobileLogo: File | null;
    favicon: File | null;
    logoDark: File | null;
    logoLight: File | null;
  }>({
    primaryLogo: null,
    appLogo: null,
    mobileLogo: null,
    favicon: null,
    logoDark: null,
    logoLight: null,
  });

  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  const [primaryRgb, setPrimaryRgb] = useState({ r: 79, g: 70, b: 229 });
  const [secondaryRgb, setSecondaryRgb] = useState({ r: 16, g: 185, b: 129 });
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<{ id: number; value: string }[]>([]);
  const [logoPreviewErrors, setLogoPreviewErrors] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (isEditMode) {
      fetchWhiteLabelData();
    }
  }, [whiteLabelId, isEditMode]);

  const fetchWhiteLabelData = async () => {
    try {
      setLoading(true);
      const response = await getWhiteLabelById(whiteLabelId);

      if (response.success && response.data) {
        const data = response.data;
        const primaryColorHex = normalizeHexColor(
          data?.primaryColorHex,
          DEFAULT_PRIMARY_HEX,
        );
        const secondaryColorHex = normalizeHexColor(
          data?.secondaryColorHex,
          DEFAULT_SECONDARY_HEX,
        );

        setFormData({
          accountId: Number(data?.accountId || 0),
          customEntryFqdn: String(data?.customEntryFqdn || ""),
          brandName: data.brandName || "",
          logoUrl: String(data?.logoUrl || ""),
          logoPath: data.logoPath || "",
          primaryLogoPath: data.primaryLogoPath || "",
          primaryLogoUrl: data.primaryLogoUrl || "",
          appLogoPath: data.appLogoPath || "",
          appLogoUrl: data.appLogoUrl || "",
          mobileLogoPath: data.mobileLogoPath || "",
          mobileLogoUrl: data.mobileLogoUrl || "",
          faviconPath: data.faviconPath || "",
          faviconUrl: data.faviconUrl || "",
          logoDarkPath: data.logoDarkPath || "",
          logoDarkUrl: data.logoDarkUrl || "",
          logoLightPath: data.logoLightPath || "",
          logoLightUrl: data.logoLightUrl || "",
          primaryColorHex,
          secondaryColorHex,
          isActive: Boolean(data?.isActive ?? true),
        });

        setPrimaryRgb(hexToRgb(primaryColorHex));
        setSecondaryRgb(hexToRgb(secondaryColorHex));
      }
    } catch (error) {
      console.error("Error fetching white label:", error);
      toast.error(t("toast.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "primaryColorHex") {
      setFormData((prev) => ({
        ...prev,
        primaryColorHex: normalizeHexColor(value, DEFAULT_PRIMARY_HEX),
      }));
      return;
    }
    if (name === "secondaryColorHex") {
      setFormData((prev) => ({
        ...prev,
        secondaryColorHex: normalizeHexColor(value, DEFAULT_SECONDARY_HEX),
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: name === "accountId" ? Number(value) : value,
    }));
  };
  const handleLogoFileChange = (
    key:
      | "primaryLogo"
      | "appLogo"
      | "mobileLogo"
      | "favicon"
      | "logoDark"
      | "logoLight",
    file: File | null,
  ) => {
    setLogoFiles((prev) => ({ ...prev, [key]: file }));
    setLogoPreviewErrors((prev) => ({ ...prev, [key]: false }));
  };

  const handleCancel = () => router.back();

  const handleActivate = async () => {
    if (!formData.accountId) {
      toast.error(t("toast.selectAccount"));
      return;
    }

    if (!formData.customEntryFqdn) {
      toast.error(t("toast.enterFqdn"));
      return;
    }

    try {
      setLoading(true);
      let mergedFormData = { ...formData };

      const hasLogoFiles = Object.values(logoFiles).some(Boolean);
      if (hasLogoFiles) {
        const uploadRes = await uploadWhiteLabelLogos({
          accountId: formData.accountId,
          primaryLogo: logoFiles.primaryLogo,
          appLogo: logoFiles.appLogo,
          mobileLogo: logoFiles.mobileLogo,
          favicon: logoFiles.favicon,
          logoDark: logoFiles.logoDark,
          logoLight: logoFiles.logoLight,
        });

        if (!uploadRes?.success) {
          toast.error(uploadRes?.message || t("toast.logoUploadFailed"));
          setLoading(false);
          return;
        }

        const uploadData = uploadRes?.data || {};
        mergedFormData = {
          ...mergedFormData,
          logoUrl: String(
            uploadData?.logoUrl ||
              uploadData?.primaryLogoUrl ||
              mergedFormData.logoUrl ||
              "",
          ),
          logoPath: String(
            uploadData?.logoPath || mergedFormData.logoPath || "",
          ),
          primaryLogoUrl: String(
            uploadData?.primaryLogoUrl || mergedFormData.primaryLogoUrl || "",
          ),
          primaryLogoPath: String(
            uploadData?.primaryLogoPath || mergedFormData.primaryLogoPath || "",
          ),
          appLogoUrl: String(
            uploadData?.appLogoUrl || mergedFormData.appLogoUrl || "",
          ),
          appLogoPath: String(
            uploadData?.appLogoPath || mergedFormData.appLogoPath || "",
          ),
          mobileLogoUrl: String(
            uploadData?.mobileLogoUrl || mergedFormData.mobileLogoUrl || "",
          ),
          mobileLogoPath: String(
            uploadData?.mobileLogoPath || mergedFormData.mobileLogoPath || "",
          ),
          faviconUrl: String(
            uploadData?.faviconUrl || mergedFormData.faviconUrl || "",
          ),
          faviconPath: String(
            uploadData?.faviconPath || mergedFormData.faviconPath || "",
          ),
          logoDarkUrl: String(
            uploadData?.logoDarkUrl || mergedFormData.logoDarkUrl || "",
          ),
          logoDarkPath: String(
            uploadData?.logoDarkPath || mergedFormData.logoDarkPath || "",
          ),
          logoLightUrl: String(
            uploadData?.logoLightUrl || mergedFormData.logoLightUrl || "",
          ),
          logoLightPath: String(
            uploadData?.logoLightPath || mergedFormData.logoLightPath || "",
          ),
        };
        setFormData(mergedFormData);
      }

      let response;
      if (isEditMode) {
        // Update existing
        const updatePayload: WhiteLabelUpdateData = {
          customEntryFqdn: mergedFormData.customEntryFqdn,
          brandName: mergedFormData.brandName || null,
          logoUrl: mergedFormData.logoUrl,
          logoPath: mergedFormData.logoPath || null,
          primaryLogoPath: mergedFormData.primaryLogoPath || null,
          primaryLogoUrl: mergedFormData.primaryLogoUrl || null,
          appLogoPath: mergedFormData.appLogoPath || null,
          appLogoUrl: mergedFormData.appLogoUrl || null,
          mobileLogoPath: mergedFormData.mobileLogoPath || null,
          mobileLogoUrl: mergedFormData.mobileLogoUrl || null,
          faviconPath: mergedFormData.faviconPath || null,
          faviconUrl: mergedFormData.faviconUrl || null,
          logoDarkPath: mergedFormData.logoDarkPath || null,
          logoDarkUrl: mergedFormData.logoDarkUrl || null,
          logoLightPath: mergedFormData.logoLightPath || null,
          logoLightUrl: mergedFormData.logoLightUrl || null,
          primaryColorHex: normalizeHexColor(
            mergedFormData.primaryColorHex,
            DEFAULT_PRIMARY_HEX,
          ),
          secondaryColorHex: normalizeHexColor(
            mergedFormData.secondaryColorHex,
            DEFAULT_SECONDARY_HEX,
          ),
          isActive: mergedFormData.isActive,
        };
        response = await updateWhiteLabel(updatePayload, whiteLabelId);
      } else {
        // Create new
        const createPayload: WhiteLabelFormData = {
          accountId: mergedFormData.accountId,
          customEntryFqdn: mergedFormData.customEntryFqdn,
          brandName: mergedFormData.brandName || null,
          logoUrl: mergedFormData.logoUrl,
          logoPath: mergedFormData.logoPath || null,
          primaryLogoPath: mergedFormData.primaryLogoPath || null,
          primaryLogoUrl: mergedFormData.primaryLogoUrl || null,
          appLogoPath: mergedFormData.appLogoPath || null,
          appLogoUrl: mergedFormData.appLogoUrl || null,
          mobileLogoPath: mergedFormData.mobileLogoPath || null,
          mobileLogoUrl: mergedFormData.mobileLogoUrl || null,
          faviconPath: mergedFormData.faviconPath || null,
          faviconUrl: mergedFormData.faviconUrl || null,
          logoDarkPath: mergedFormData.logoDarkPath || null,
          logoDarkUrl: mergedFormData.logoDarkUrl || null,
          logoLightPath: mergedFormData.logoLightPath || null,
          logoLightUrl: mergedFormData.logoLightUrl || null,
          primaryColorHex: normalizeHexColor(
            mergedFormData.primaryColorHex,
            DEFAULT_PRIMARY_HEX,
          ),
          secondaryColorHex: normalizeHexColor(
            mergedFormData.secondaryColorHex,
            DEFAULT_SECONDARY_HEX,
          ),
          isActive: mergedFormData.isActive,
        };
        response = await saveWhiteLabel(createPayload);
      }

      if (response.success) {
        toast.success(
          t("toast.saved", {
            mode: isEditMode ? t("modes.updated") : t("modes.created"),
          }),
        );
        router.push("/whiteLabel");
      } else {
        toast.error(t("toast.saveFailed", { message: response.message }));
      }
    } catch (error) {
      console.error("Error saving white label:", error);
      toast.error(t("toast.saveError"));
    } finally {
      setLoading(false);
    }
  };

  const handlePrimaryColorChange = (color: string) => {
    setFormData((prev) => ({ ...prev, primaryColorHex: color }));
    const bigint = parseInt(color.slice(1), 16);
    setPrimaryRgb({
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    });
  };

  const handleSecondaryColorChange = (color: string) => {
    setFormData((prev) => ({ ...prev, secondaryColorHex: color }));
    const bigint = parseInt(color.slice(1), 16);
    setSecondaryRgb({
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    });
  };

  const updatePrimaryRgb = (channel: "r" | "g" | "b", value: number) => {
    const newRgb = { ...primaryRgb, [channel]: value };
    setPrimaryRgb(newRgb);
    const hex =
      "#" +
      ((1 << 24) + (newRgb.r << 16) + (newRgb.g << 8) + newRgb.b)
        .toString(16)
        .slice(1)
        .toUpperCase();
    setFormData((prev) => ({ ...prev, primaryColorHex: hex }));
  };

  const updateSecondaryRgb = (channel: "r" | "g" | "b", value: number) => {
    const newRgb = { ...secondaryRgb, [channel]: value };
    setSecondaryRgb(newRgb);
    const hex =
      "#" +
      ((1 << 24) + (newRgb.r << 16) + (newRgb.g << 8) + newRgb.b)
        .toString(16)
        .slice(1)
        .toUpperCase();
    setFormData((prev) => ({ ...prev, secondaryColorHex: hex }));
  };

  async function fetchAllAcounts() {
    const response = await getAllAccounts();
    if (response && response.statusCode === 200) {
      // toast.success(response.message);
      setAccounts(response.data);
    }
  }

  useEffect(() => {
    fetchAllAcounts();
  }, []);

  if (loading && isEditMode) {
    return (
      <div className={`${isDark ? "dark" : ""}`}>
        <div
          className={`min-h-screen ${isDark ? "bg-background" : "bg-gray-50"} p-6 flex items-center justify-center`}
        >
          <p className={isDark ? "text-foreground text-lg" : "text-gray-700 text-lg"}>
            {t("loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""}`}>
      <div className={`min-h-screen ${isDark ? "bg-background" : "bg-gray-50"} p-6`}>
        <div className="max-w-7xl mx-auto mb-6">
          <PageHeader
            title={isEditMode ? t("title.edit") : t("title.create")}
            breadcrumbs={[
              { label: tList("breadcrumbs.accounts") },
              { label: tList("breadcrumbs.current"), href: "/whiteLabel" },
              { label: isEditMode ? t("title.edit") : t("title.create") },
            ]}
            showButton
            buttonText={
              loading
                ? t("buttons.saving")
                : isEditMode
                  ? t("buttons.update")
                  : t("buttons.activate")
            }
            onButtonClick={handleActivate}
          />
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Core Instance Mapping */}
              <div
                className={`rounded-xl shadow-sm border p-6 ${
                  isDark ? "bg-card border-border" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-6">
                  <Globe className="w-5 h-5" style={{ color: selectedColor }} />
                  <h2 className="text-xl font-bold text-foreground">
                    {t("sections.coreInstanceMapping")}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("labels.account")}
                    </label>
                    <select
                      name="accountId"
                      value={formData.accountId}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                          : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    >
                      <option value="">{t("labels.selectAccount")}</option>
                      {accounts &&
                        accounts.map(
                          (account: { id: number; value: string }) => (
                            <option key={account.id} value={account.id}>
                              {account.value}
                            </option>
                          ),
                        )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      {t("labels.customEntryFqdn")}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground opacity-50 text-sm">
                        https://
                      </span>
                      <input
                        type="text"
                        name="customEntryFqdn"
                        value={formData.customEntryFqdn}
                        onChange={handleInputChange}
                        placeholder={t("labels.customEntryFqdnPlaceholder")}
                        className={`w-full pl-20 pr-4 py-2.5 rounded-lg border transition-colors ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-foreground"
                            : "bg-white border-gray-300 text-gray-900"
                        } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      {t("labels.brandName")}
                    </label>
                    <input
                      type="text"
                      name="brandName"
                      value={formData.brandName}
                      onChange={handleInputChange}
                      placeholder={t("labels.brandNamePlaceholder")}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground"
                          : "bg-white border-gray-300 text-gray-900"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                  </div>
                </div>
              </div>

              {/* Visual Identity Systems */}
              <div
                className={`rounded-xl shadow-sm border p-6 ${
                  isDark ? "bg-card border-border" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-6">
                  <Palette
                    className="w-5 h-5"
                    style={{ color: selectedColor }}
                  />
                  <h2 className="text-xl font-bold text-foreground">
                    {t("sections.visualIdentitySystems")}
                  </h2>
                </div>

                <div className="space-y-6">
                  {/* Brand Mark / Logo URL */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                      {t("labels.logoUrl")}
                    </label>
                    <input
                      type="text"
                      name="logoUrl"
                      value={formData.logoUrl}
                      onChange={handleInputChange}
                      placeholder={t("labels.logoUrlPlaceholder")}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground"
                          : "bg-white border-gray-300 text-gray-900"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        key: "primaryLogo",
                        label: t("labels.primaryLogo"),
                        urlKey: "primaryLogoUrl",
                      },
                      {
                        key: "appLogo",
                        label: t("labels.appLogo"),
                        urlKey: "appLogoUrl",
                      },
                      {
                        key: "mobileLogo",
                        label: t("labels.mobileLogo"),
                        urlKey: "mobileLogoUrl",
                      },
                      {
                        key: "favicon",
                        label: t("labels.favicon"),
                        urlKey: "faviconUrl",
                      },
                      {
                        key: "logoDark",
                        label: t("labels.logoDark"),
                        urlKey: "logoDarkUrl",
                      },
                      {
                        key: "logoLight",
                        label: t("labels.logoLight"),
                        urlKey: "logoLightUrl",
                      },
                    ].map((item) => (
                      <div key={item.key}>
                        <label className="block text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                          {item.label}
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleLogoFileChange(
                              item.key as
                                | "primaryLogo"
                                | "appLogo"
                                | "mobileLogo"
                                | "favicon"
                                | "logoDark"
                                | "logoLight",
                              e.target.files?.[0] || null,
                            )
                          }
                          className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                            isDark
                              ? "bg-gray-800 border-gray-700 text-foreground"
                              : "bg-white border-gray-300 text-gray-900"
                          } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                        />
                        <input
                          type="text"
                          value={String((formData as any)[item.urlKey] || "")}
                          readOnly
                          placeholder={t("labels.uploadedUrlPlaceholder")}
                          className={`w-full mt-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                            isDark
                              ? "bg-gray-900 border-gray-700 text-gray-300"
                              : "bg-gray-50 border-gray-200 text-gray-700"
                          }`}
                        />
                        {(() => {
                          const rawUrl = String(
                            (formData as any)[item.urlKey] || "",
                          );
                          const previewUrl = resolveMediaUrl(rawUrl);
                          const hasPreview =
                            Boolean(previewUrl) && !logoPreviewErrors[item.key];
                          return (
                            <div
                              className={`mt-2 rounded-lg border h-20 flex items-center justify-center overflow-hidden ${
                                isDark
                                  ? "bg-gray-900 border-gray-700"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              {hasPreview ? (
                                <img
                                  src={previewUrl}
                                  alt={item.label}
                                  className="w-full h-full object-contain"
                                  onError={() =>
                                    setLogoPreviewErrors((prev) => ({
                                      ...prev,
                                      [item.key]: true,
                                    }))
                                  }
                                />
                              ) : (
                                <span
                                  className={`text-xs ${
                                    isDark ? "text-gray-400" : "text-gray-500"
                                  }`}
                                >
                                  {t("labels.noImagePreview")}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>

                  {/* Color Palettes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Primary Palette */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                        {t("labels.primaryColor")}
                      </label>
                      <div
                        className={`rounded-xl border p-4 ${
                          isDark
                            ? "bg-background border-border"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <button
                            onClick={() =>
                              setShowPrimaryPicker(!showPrimaryPicker)
                            }
                            className="w-16 h-16 rounded-lg border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform"
                            style={{
                              backgroundColor: normalizeHexColor(
                                formData.primaryColorHex,
                                DEFAULT_PRIMARY_HEX,
                              ),
                            }}
                          />
                          <div>
                            <p className="text-xs font-bold text-foreground opacity-50 uppercase tracking-wide mb-1">
                              HEX
                            </p>
                            <input
                              type="text"
                              name="primaryColorHex"
                              value={normalizeHexColor(
                                formData.primaryColorHex,
                                DEFAULT_PRIMARY_HEX,
                              )}
                              onChange={handleInputChange}
                              className="text-base font-bold text-foreground bg-transparent border-none focus:outline-none w-32"
                            />
                          </div>
                        </div>

                        {showPrimaryPicker && (
                          <div className="space-y-4">
                            <HexColorPicker
                              color={normalizeHexColor(
                                formData.primaryColorHex,
                                DEFAULT_PRIMARY_HEX,
                              )}
                              onChange={handlePrimaryColorChange}
                            />
                            <div className="grid grid-cols-3 gap-3">
                              {(["r", "g", "b"] as const).map((c) => (
                                <div key={c}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="255"
                                    value={primaryRgb[c]}
                                    onChange={(e) =>
                                      updatePrimaryRgb(
                                        c,
                                        Number(e.target.value),
                                      )
                                    }
                                    className={`w-full px-3 py-2 text-center rounded-lg border transition-colors ${
                                      isDark
                                        ? "bg-gray-800 border-gray-700 text-foreground"
                                        : "bg-white border-gray-300 text-gray-900"
                                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                                  />
                                  <p className="text-xs text-center font-semibold text-foreground mt-1 uppercase">
                                    {c}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Secondary Palette */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                        {t("labels.secondaryColor")}
                      </label>
                      <div
                        className={`rounded-xl border p-4 ${
                          isDark
                            ? "bg-background border-border"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <button
                            onClick={() =>
                              setShowSecondaryPicker(!showSecondaryPicker)
                            }
                            className="w-16 h-16 rounded-lg border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform"
                            style={{
                              backgroundColor: normalizeHexColor(
                                formData.secondaryColorHex,
                                DEFAULT_SECONDARY_HEX,
                              ),
                            }}
                          />
                          <div>
                            <p className="text-xs font-bold text-foreground opacity-50 uppercase tracking-wide mb-1">
                              HEX
                            </p>
                            <input
                              type="text"
                              name="secondaryColorHex"
                              value={normalizeHexColor(
                                formData.secondaryColorHex,
                                DEFAULT_SECONDARY_HEX,
                              )}
                              onChange={handleInputChange}
                              className="text-base font-bold text-foreground bg-transparent border-none focus:outline-none w-32"
                            />
                          </div>
                        </div>

                        {showSecondaryPicker && (
                          <div className="space-y-4">
                            <HexColorPicker
                              color={normalizeHexColor(
                                formData.secondaryColorHex,
                                DEFAULT_SECONDARY_HEX,
                              )}
                              onChange={handleSecondaryColorChange}
                            />
                            <div className="grid grid-cols-3 gap-3">
                              {(["r", "g", "b"] as const).map((c) => (
                                <div key={c}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="255"
                                    value={secondaryRgb[c]}
                                    onChange={(e) =>
                                      updateSecondaryRgb(
                                        c,
                                        Number(e.target.value),
                                      )
                                    }
                                    className={`w-full px-3 py-2 text-center rounded-lg border transition-colors ${
                                      isDark
                                        ? "bg-gray-800 border-gray-700 text-foreground"
                                        : "bg-white border-gray-300 text-gray-900"
                                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                                  />
                                  <p className="text-xs text-center font-semibold text-foreground mt-1 uppercase">
                                    {c}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Toggle */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          isActive: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="isActive"
                      className="text-sm font-semibold text-foreground cursor-pointer"
                    >
                      {t("labels.activeStatus")}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Identity Blueprint */}
            <div className="lg:col-span-1">
              <div
                className={`rounded-xl shadow-lg border border-t-4 overflow-hidden sticky top-24 ${
                  isDark ? "bg-card border-border" : "bg-white border-gray-200"
                }`}
                style={{ borderTopColor: selectedColor }}
              >
                <div className="p-6">
                  <h3
                    className="text-sm font-bold uppercase tracking-wide mb-1"
                    style={{ color: selectedColor }}
                  >
                    {t("sections.identityBlueprint")}
                  </h3>
                  <p className="text-sm text-foreground opacity-60">
                    {t("summary.subtitle")}
                  </p>
                </div>

                <div className="px-6 py-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground opacity-70">
                      {t("labels.fqdn")}
                    </span>
                    <span
                      className="text-sm font-bold break-all"
                      style={{ color: selectedColor }}
                    >
                      {formData.customEntryFqdn || t("summary.notSet")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground opacity-70">
                      {t("labels.accountCaps")}
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {accounts?.length > 0 &&
                        accounts.find(
                          (val: { id: number; value: string }) =>
                            val.id === formData.accountId,
                        )?.value}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground opacity-70">
                      {t("labels.statusCaps")}
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded ${
                        formData.isActive
                          ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {formData.isActive
                        ? t("summary.active")
                        : t("summary.inactive")}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="text-xs font-semibold text-foreground opacity-70 mb-2">
                      {t("labels.colorPreview")}
                    </p>
                    <div className="flex gap-2">
                      <div
                        className="flex-1 h-12 rounded border-2 border-white shadow-sm"
                        style={{ backgroundColor: formData.primaryColorHex }}
                        title={`Primary: ${normalizeHexColor(formData.primaryColorHex, DEFAULT_PRIMARY_HEX)}`}
                      />
                      <div
                        className="flex-1 h-12 rounded border-2 border-white shadow-sm"
                        style={{
                          backgroundColor: normalizeHexColor(
                            formData.secondaryColorHex,
                            DEFAULT_SECONDARY_HEX,
                          ),
                        }}
                        title={`Secondary: ${normalizeHexColor(formData.secondaryColorHex, DEFAULT_SECONDARY_HEX)}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 space-y-3">
                  <button
                    onClick={handleCancel}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${
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
        </div>
      </div>
    </div>
  );
};

export default ProvisionBranding;
