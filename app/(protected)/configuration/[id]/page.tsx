"use client";

import PageHeader from "@/components/PageHeader";
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

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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

        {loading && isEditMode ? (
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
                  <option value="">{t("fields.selectAccount")}</option>
                  {accounts &&
                    accounts.map((account: { id: number; value: string }) => (
                      <option key={account.id} value={account.id}>
                        {account.value}
                      </option>
                    ))}
                </select>
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
                      <select
                        name="mapProvider"
                        value={formData.mapProvider}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                            : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                        } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                      >
                        <option value="GoogleMaps">
                          {t("options.mapProvider.googleMaps")}
                        </option>
                        <option value="HereMaps">
                          {t("options.mapProvider.hereMaps")}
                        </option>
                        <option value="OpenStreetMap">
                          {t("options.mapProvider.openStreetMap")}
                        </option>
                      </select>
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
                    <select
                      name="dateFormat"
                      value={formData.dateFormat}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                          : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  {/* Time Format */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.timeFormat")}
                    </label>
                    <select
                      name="timeFormat"
                      value={formData.timeFormat}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                          : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    >
                      <option value="12H">{t("options.timeFormat.h12")}</option>
                      <option value="24H">{t("options.timeFormat.h24")}</option>
                    </select>
                  </div>

                  {/* Distance Unit */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.distanceUnit")}
                    </label>
                    <select
                      name="distanceUnit"
                      value={formData.distanceUnit}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                          : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    >
                      <option value="KM">{t("options.distanceUnit.km")}</option>
                      <option value="MILE">
                        {t("options.distanceUnit.mile")}
                      </option>
                    </select>
                  </div>

                  {/* Speed Unit */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.speedUnit")}
                    </label>
                    <select
                      name="speedUnit"
                      value={formData.speedUnit}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                          : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    >
                      <option value="KMH">{t("options.speedUnit.kmh")}</option>
                      <option value="MPH">{t("options.speedUnit.mph")}</option>
                    </select>
                  </div>

                  {/* Fuel Unit */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.fuelUnit")}
                    </label>
                    <select
                      name="fuelUnit"
                      value={formData.fuelUnit}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                          : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    >
                      <option value="LITRE">
                        {t("options.fuelUnit.litre")}
                      </option>
                      <option value="GALLON">
                        {t("options.fuelUnit.gallon")}
                      </option>
                    </select>
                  </div>

                  {/* Temperature */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.temperature")}
                    </label>
                    <select
                      name="temperatureUnit"
                      value={formData.temperatureUnit}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                          : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    >
                      <option value="CELSIUS">
                        {t("options.temperature.celsius")}
                      </option>
                      <option value="FAHRENHEIT">
                        {t("options.temperature.fahrenheit")}
                      </option>
                    </select>
                  </div>

                  {/* Address Display */}
                  <div className="md:col-span-2">
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {t("fields.addressDisplay")}
                    </label>
                    <select
                      name="addressDisplay"
                      value={formData.addressDisplay}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                          : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                      } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    >
                      <option value="SHOW">
                        {t("options.addressDisplay.show")}
                      </option>
                      <option value="HIDE">
                        {t("options.addressDisplay.hide")}
                      </option>
                    </select>
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
                      <select
                        name="defaultLanguage"
                        value={formData.defaultLanguage}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                            : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                        } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                      >
                        <option value="en">{t("options.language.en")}</option>
                        <option value="es">{t("options.language.es")}</option>
                        <option value="fr">{t("options.language.fr")}</option>
                        <option value="de">{t("options.language.de")}</option>
                        <option value="hi">{t("options.language.hi")}</option>
                      </select>
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
                        <select
                          value={lang}
                          onChange={(e) =>
                            handleLanguageChange(index, e.target.value)
                          }
                          className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                            isDark
                              ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                              : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                          } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                        >
                          <option value="">{t("fields.selectLanguage")}</option>
                          <option value="en">{t("options.language.en")}</option>
                          <option value="es">{t("options.language.es")}</option>
                          <option value="fr">{t("options.language.fr")}</option>
                          <option value="de">{t("options.language.de")}</option>
                          <option value="hi">{t("options.language.hi")}</option>
                        </select>
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
