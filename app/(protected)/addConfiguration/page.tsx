"use client";

import React, { useState } from "react";
import { Map, Globe, Languages, Plus } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useColor } from "@/context/ColorContext";
import { useRouter } from "next/navigation";
import ThemeCustomizer from "@/components/ThemeCustomizer";

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
  const router = useRouter();

  const [formData, setFormData] = useState({
    account: "",
    mapProvider: "Google Maps (Default)",
    licenseKey: "",
    addressKey: "",
    dateFormat: "DD/MM/YYYY (Default)",
    timeFormat: "12 Hour (AM/PM) (Default)",
    distanceUnit: "Kilometers (Default)",
    speedUnit: "Km/h (Default)",
    fuelUnit: "Litre (Default)",
    temperature: "Celsius (Default)",
    addressDisplay: "Show Address",
    defaultLanguage: "English (Default)",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-2`}>
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8 px-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <h1
              className={`text-2xl sm:text-3xl font-bold ${
                isDark ? "text-foreground" : "text-gray-900"
              }`}
            >
              New Configuration
            </h1>

            <button
              className={`w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors ${
                isDark
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
              onClick={() => router.back()}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Account Selection */}
          <Card isDark={isDark}>
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
              >
                Account
              </label>
              <select
                name="account"
                value={formData.account}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                    : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              >
                <option value="">Select Account</option>
                <option value="account1">Account 1</option>
                <option value="account2">Account 2</option>
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
                  Map Configuration
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Map Provider */}
                <div className="relative">
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Map Provider
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
                      <option value="Google Maps (Default)">
                        Google Maps (Default)
                      </option>
                      <option value="Here Maps">Here Maps</option>
                      <option value="OpenStreetMap">OpenStreetMap</option>
                    </select>
                  </div>
                </div>

                {/* License Key */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    License Key
                  </label>
                  <input
                    type="text"
                    name="licenseKey"
                    value={formData.licenseKey}
                    onChange={handleInputChange}
                    placeholder="Enter License Key"
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
                    Address Key
                  </label>
                  <input
                    type="text"
                    name="addressKey"
                    value={formData.addressKey}
                    onChange={handleInputChange}
                    placeholder="Enter Address Key"
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
                  Internationalization & Unit Configuration
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Date Format */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Date Format
                  </label>
                  <input
                    type="text"
                    name="dateFormat"
                    value={formData.dateFormat}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                        : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>

                {/* Time Format */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Time Format
                  </label>
                  <input
                    type="text"
                    name="timeFormat"
                    value={formData.timeFormat}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                        : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>

                {/* Distance Unit */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Distance Unit
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
                    <option>Kilometers (Default)</option>
                    <option>Miles</option>
                  </select>
                </div>

                {/* Speed Unit */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Speed Unit
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
                    <option>Km/h (Default)</option>
                    <option>Mph</option>
                  </select>
                </div>

                {/* Fuel Unit */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Fuel Unit
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
                    <option>Litre (Default)</option>
                    <option>Gallon</option>
                  </select>
                </div>

                {/* Temperature */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Temperature
                  </label>
                  <select
                    name="temperature"
                    value={formData.temperature}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground focus:border-purple-500"
                        : "bg-white border-gray-300 text-gray-900 focus:border-purple-500"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  >
                    <option>Celsius (Default)</option>
                    <option>Fahrenheit</option>
                  </select>
                </div>

                {/* Address Display */}
                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Address Display
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
                    <option>Show Address</option>
                    <option>Hide Address</option>
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
                  Language Configuration
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-end gap-10">
                  <div className="w-[48%]">
                    <label
                      className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Default Language
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
                      <option>English (Default)</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>

                  <button
                    className={`w-[48%] border border-dotted border-border rounded-lg flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                      isDark
                        ? "text-gray-300 hover:text-foreground"
                        : "text-gray-700 hover:text-gray-900"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Add More Languages
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              className="text-white px-8 py-3 rounded-lg font-medium transition-colors"
              style={{ background: selectedColor }}
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
      <ThemeCustomizer />
    </div>
  );
};

export default NewConfiguration;
