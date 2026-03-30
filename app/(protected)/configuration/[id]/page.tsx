"use client";

import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { getAllAccounts } from "@/services/commonServie";
import {
  getConfigurationById,
  saveConfiguration,
  updateConfiguration,
} from "@/services/configurationService";
import { Globe, Languages, Map, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

const Card = ({
  children,
  isDark,
}: {
  children: React.ReactNode;
  isDark: boolean;
}) => (
  <div
    className={`${isDark ? "bg-card" : "bg-white"} rounded-xl shadow-lg p-6 border ${isDark ? "border-gray-800" : "border-gray-200"}`}
  >
    {children}
  </div>
);

const NewConfiguration: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const t = useTranslations("pages.configuration.detail");
  const tList = useTranslations("pages.configuration.list");
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const isEditMode = id && id !== "0";
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [formData, setFormData] = useState({
    accountId: 0,
    mapProvider: "GoogleMaps",
    licenseKey: "",
    addressKey: "",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12H",
    distanceUnit: "KM",
    speedUnit: "KMH",
    fuelUnit: "LITRE",
    temperatureUnit: "CELSIUS",
    addressDisplay: "SHOW",
    defaultLanguage: "en",
    allowedLanguages: [] as string[],
  });

  const [additionalLanguages, setAdditionalLanguages] = useState<string[]>([]);
  const accountOptions = accounts.map((account: { id: number; value: string }) => ({
    value: account.id,
    label: account.value,
  }));
  const mapProviderOptions = [
    { value: "GoogleMaps", label: t("options.mapProvider.googleMaps") },
    { value: "HereMaps", label: t("options.mapProvider.hereMaps") },
    { value: "OpenStreetMap", label: t("options.mapProvider.openStreetMap") },
  ];
  const dateFormatOptions = [
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  ];
  const timeFormatOptions = [
    { value: "12H", label: t("options.timeFormat.h12") },
    { value: "24H", label: t("options.timeFormat.h24") },
  ];
  const distanceUnitOptions = [
    { value: "KM", label: t("options.distanceUnit.km") },
    { value: "MILE", label: t("options.distanceUnit.mile") },
  ];
  const speedUnitOptions = [
    { value: "KMH", label: t("options.speedUnit.kmh") },
    { value: "MPH", label: t("options.speedUnit.mph") },
  ];
  const fuelUnitOptions = [
    { value: "LITRE", label: t("options.fuelUnit.litre") },
    { value: "GALLON", label: t("options.fuelUnit.gallon") },
  ];
  const temperatureOptions = [
    { value: "CELSIUS", label: t("options.temperature.celsius") },
    { value: "FAHRENHEIT", label: t("options.temperature.fahrenheit") },
  ];
  const addressDisplayOptions = [
    { value: "SHOW", label: t("options.addressDisplay.show") },
    { value: "HIDE", label: t("options.addressDisplay.hide") },
  ];
  const languageOptions = [
    { value: "en", label: t("options.language.en") },
    { value: "es", label: t("options.language.es") },
    { value: "fr", label: t("options.language.fr") },
    { value: "de", label: t("options.language.de") },
    { value: "hi", label: t("options.language.hi") },
  ];

  const fetchConfiguration = async () => {
    try {
      setFetchingData(true);
      const response = await getConfigurationById(Number(id));
      if (response.success && response.data) {
        const config = response.data;
        setFormData({
          accountId: config.accountId,
          mapProvider: config.mapProvider || "GoogleMaps",
          licenseKey: config.licenseKey || "",
          addressKey: config.addressKey || "",
          dateFormat: config.dateFormat || "DD/MM/YYYY",
          timeFormat: config.timeFormat || "12H",
          distanceUnit: config.distanceUnit || "KM",
          speedUnit: config.speedUnit || "KMH",
          fuelUnit: config.fuelUnit || "LITRE",
          temperatureUnit: config.temperatureUnit || "CELSIUS",
          addressDisplay: config.addressDisplay || "SHOW",
          defaultLanguage: config.defaultLanguage || "en",
          allowedLanguages: config.allowedLanguages || [],
        });
        setAdditionalLanguages(config.allowedLanguages || []);
      }
    } catch (error) {
      console.error("Error fetching configuration:", error);
      toast.error(t("toast.loadFailed"));
    } finally {
      setFetchingData(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "accountId" ? Number(value) : value,
    }));
  };

  const handleAddLanguage = () => {
    setAdditionalLanguages([...additionalLanguages, ""]);
  };

  const handleRemoveLanguage = (index: number) => {
    setAdditionalLanguages(additionalLanguages.filter((_, i) => i !== index));
  };

  const handleLanguageChange = (index: number, value: string) => {
    const updated = [...additionalLanguages];
    updated[index] = value;
    setAdditionalLanguages(updated);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.accountId || formData.accountId === 0) {
      toast.error(t("toast.accountRequired"));
      return;
    }

    try {
      setLoading(true);

      // Filter out empty languages and ensure no duplicates
      const filteredLanguages = Array.from(
        new Set(additionalLanguages.filter((lang) => lang.trim() !== "")),
      );

      const payload = {
        accountId: formData.accountId,
        mapProvider: formData.mapProvider,
        licenseKey: formData.licenseKey || undefined,
        addressKey: formData.addressKey || undefined,
        dateFormat: formData.dateFormat,
        timeFormat: formData.timeFormat,
        distanceUnit: formData.distanceUnit,
        speedUnit: formData.speedUnit,
        fuelUnit: formData.fuelUnit,
        temperatureUnit: formData.temperatureUnit,
        addressDisplay: formData.addressDisplay,
        defaultLanguage: formData.defaultLanguage,
        allowedLanguages:
          filteredLanguages.length > 0 ? filteredLanguages : undefined,
      };

      let response;
      if (isEditMode) {
        response = await updateConfiguration(payload, Number(id));
      } else {
        response = await saveConfiguration(payload);
      }

      if (response.success) {
        toast.success(isEditMode ? t("toast.updated") : t("toast.created"));
        router.push("/configuration");
      } else {
        toast.error(t("toast.saveFailed", { message: response.message }));
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error(t("toast.saveError"));
    } finally {
      setLoading(false);
    }
  };

  async function fetchAllAcounts() {
    const response = await getAllAccounts();
    if (response && response.statusCode === 200) {
      // toast.success(response.message);
      setAccounts(response.data);
    }
  }

  useEffect(() => {
    if (isEditMode) {
      fetchConfiguration();
    }
    fetchAllAcounts();
  }, [id, isEditMode, t]);

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader
        isVisible={fetchingData}
        text="Loading configuration details..."
      />
      <ActionLoader
        isVisible={loading}
        text={isEditMode ? "Updating configuration..." : "Creating configuration..."}
      />
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-3 sm:p-4 md:p-6`}
      >
        <div className="mb-6">
          <PageHeader
            title={isEditMode ? t("title.edit") : t("title.create")}
            breadcrumbs={[
              { label: tList("breadcrumbs.accounts") },
              { label: tList("breadcrumbs.current"), href: "/configuration" },
              { label: isEditMode ? t("title.edit") : t("title.create") },
            ]}
            showButton
            buttonText={
              loading
                ? t("buttons.saving")
                : isEditMode
                  ? t("buttons.update")
                  : t("buttons.create")
            }
            onButtonClick={handleSubmit}
          />
        </div>

        {fetchingData && isEditMode ? (
          <div className="flex items-center justify-center p-8">
            <p>{t("loading.edit")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account Selection */}
            <Card isDark={isDark}>
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  {t("fields.accountId")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={accountOptions}
                  value={
                    accountOptions.find(
                      (option) => Number(option.value) === Number(formData.accountId),
                    ) || null
                  }
                  onChange={(option) =>
                    setFormData((prev) => ({
                      ...prev,
                      accountId: Number(option?.value || 0),
                    }))
                  }
                  placeholder={t("fields.selectAccount")}
                  isDark={isDark}
                  noOptionsMessage={t("fields.selectAccount")}
                />
              </div>
            </Card>

            {/* Map Configuration */}
            <Card isDark={isDark}>
              <div className="mb-6">
                <div className="flex justify-center flex-col items-center gap-2 mb-6 border-b border-border p-2">
                  <Map className="w-5 h-5" style={{ color: selectedColor }} />
                  <h2
                    className={`text-lg font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}
                  >
                    {t("sections.mapConfiguration")}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Map Provider */}
                  <div className="relative">
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.mapProvider")}
                    </label>
                    <div className="relative">
                      <SearchableDropdown
                        options={mapProviderOptions}
                        value={
                          mapProviderOptions.find(
                            (option) => option.value === formData.mapProvider,
                          ) || null
                        }
                        onChange={(option) =>
                          setFormData((prev) => ({
                            ...prev,
                            mapProvider: String(option?.value || "GoogleMaps"),
                          }))
                        }
                        isDark={isDark}
                        noOptionsMessage={t("fields.mapProvider")}
                      />
                    </div>
                  </div>

                  {/* License Key */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.licenseKey")}
                    </label>
                    <input
                      type="text"
                      name="licenseKey"
                      value={formData.licenseKey}
                      onChange={handleInputChange}
                      placeholder={t("fields.licenseKeyPlaceholder")}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500 focus:border-purple-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                  </div>

                  {/* Address Key */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.addressKey")}
                    </label>
                    <input
                      type="text"
                      name="addressKey"
                      value={formData.addressKey}
                      onChange={handleInputChange}
                      placeholder={t("fields.addressKeyPlaceholder")}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500 focus:border-purple-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Internationalization & Unit Configuration */}
            <Card isDark={isDark}>
              <div className="mb-6">
                <div className="flex justify-center flex-col items-center gap-2 mb-6 border-b border-border p-2">
                  <Globe className="w-5 h-5" style={{ color: selectedColor }} />
                  <h2
                    className={`text-lg font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}
                  >
                    {t("sections.internationalization")}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Date Format */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.dateFormat")}
                    </label>
                    <SearchableDropdown
                      options={dateFormatOptions}
                      value={
                        dateFormatOptions.find(
                          (option) => option.value === formData.dateFormat,
                        ) || null
                      }
                      onChange={(option) =>
                        setFormData((prev) => ({
                          ...prev,
                          dateFormat: String(option?.value || "DD/MM/YYYY"),
                        }))
                      }
                      isDark={isDark}
                      noOptionsMessage={t("fields.dateFormat")}
                    />
                  </div>

                  {/* Time Format */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.timeFormat")}
                    </label>
                    <SearchableDropdown
                      options={timeFormatOptions}
                      value={
                        timeFormatOptions.find(
                          (option) => option.value === formData.timeFormat,
                        ) || null
                      }
                      onChange={(option) =>
                        setFormData((prev) => ({
                          ...prev,
                          timeFormat: String(option?.value || "12H"),
                        }))
                      }
                      isDark={isDark}
                      noOptionsMessage={t("fields.timeFormat")}
                    />
                  </div>

                  {/* Distance Unit */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.distanceUnit")}
                    </label>
                    <SearchableDropdown
                      options={distanceUnitOptions}
                      value={
                        distanceUnitOptions.find(
                          (option) => option.value === formData.distanceUnit,
                        ) || null
                      }
                      onChange={(option) =>
                        setFormData((prev) => ({
                          ...prev,
                          distanceUnit: String(option?.value || "KM"),
                        }))
                      }
                      isDark={isDark}
                      noOptionsMessage={t("fields.distanceUnit")}
                    />
                  </div>

                  {/* Speed Unit */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.speedUnit")}
                    </label>
                    <SearchableDropdown
                      options={speedUnitOptions}
                      value={
                        speedUnitOptions.find(
                          (option) => option.value === formData.speedUnit,
                        ) || null
                      }
                      onChange={(option) =>
                        setFormData((prev) => ({
                          ...prev,
                          speedUnit: String(option?.value || "KMH"),
                        }))
                      }
                      isDark={isDark}
                      noOptionsMessage={t("fields.speedUnit")}
                    />
                  </div>

                  {/* Fuel Unit */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.fuelUnit")}
                    </label>
                    <SearchableDropdown
                      options={fuelUnitOptions}
                      value={
                        fuelUnitOptions.find(
                          (option) => option.value === formData.fuelUnit,
                        ) || null
                      }
                      onChange={(option) =>
                        setFormData((prev) => ({
                          ...prev,
                          fuelUnit: String(option?.value || "LITRE"),
                        }))
                      }
                      isDark={isDark}
                      noOptionsMessage={t("fields.fuelUnit")}
                    />
                  </div>

                  {/* Temperature */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.temperature")}
                    </label>
                    <SearchableDropdown
                      options={temperatureOptions}
                      value={
                        temperatureOptions.find(
                          (option) => option.value === formData.temperatureUnit,
                        ) || null
                      }
                      onChange={(option) =>
                        setFormData((prev) => ({
                          ...prev,
                          temperatureUnit: String(option?.value || "CELSIUS"),
                        }))
                      }
                      isDark={isDark}
                      noOptionsMessage={t("fields.temperature")}
                    />
                  </div>

                  {/* Address Display */}
                  <div className="md:col-span-2">
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.addressDisplay")}
                    </label>
                    <SearchableDropdown
                      options={addressDisplayOptions}
                      value={
                        addressDisplayOptions.find(
                          (option) => option.value === formData.addressDisplay,
                        ) || null
                      }
                      onChange={(option) =>
                        setFormData((prev) => ({
                          ...prev,
                          addressDisplay: String(option?.value || "SHOW"),
                        }))
                      }
                      isDark={isDark}
                      noOptionsMessage={t("fields.addressDisplay")}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Language Configuration */}
            <Card isDark={isDark}>
              <div>
                <div className="flex justify-center flex-col items-center gap-2 mb-6 border-b border-border p-2">
                  <Languages
                    className="w-5 h-5"
                    style={{ color: selectedColor }}
                  />
                  <h2
                    className={`text-lg font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}
                  >
                    {t("sections.languageConfiguration")}
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-end gap-10">
                    <div className="w-[48%]">
                      <label
                        className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                      >
                        {t("fields.defaultLanguage")}
                      </label>
                      <SearchableDropdown
                        options={languageOptions}
                        value={
                          languageOptions.find(
                            (option) => option.value === formData.defaultLanguage,
                          ) || null
                        }
                        onChange={(option) =>
                          setFormData((prev) => ({
                            ...prev,
                            defaultLanguage: String(option?.value || "en"),
                          }))
                        }
                        isDark={isDark}
                        noOptionsMessage={t("fields.defaultLanguage")}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddLanguage}
                      className={`w-[48%] border border-dotted border-border rounded-lg flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                        isDark
                          ? "text-gray-300 hover:text-foreground"
                          : "text-gray-700 hover:text-gray-900"
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      {t("buttons.addMoreLanguages")}
                    </button>
                  </div>

                  {/* Additional Languages */}
                  {additionalLanguages.map((lang, index) => (
                    <div key={index} className="flex items-end gap-4">
                      <div className="flex-1">
                        <label
                          className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                        >
                          {t("fields.additionalLanguage", {
                            index: index + 1,
                          })}
                        </label>
                        <SearchableDropdown
                          options={languageOptions}
                          value={
                            languageOptions.find(
                              (option) => option.value === lang,
                            ) || null
                          }
                          onChange={(option) =>
                            handleLanguageChange(
                              index,
                              String(option?.value || ""),
                            )
                          }
                          placeholder={t("fields.selectLanguage")}
                          isDark={isDark}
                          noOptionsMessage={t("fields.selectLanguage")}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLanguage(index)}
                        className={`px-3 py-2.5 rounded-lg border transition-colors ${
                          isDark
                            ? "border-red-800 text-red-400 hover:bg-red-900/20"
                            : "border-red-300 text-red-600 hover:bg-red-50"
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <button
                className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
                onClick={() => router.back()}
                disabled={loading}
              >
                {t("buttons.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewConfiguration;
