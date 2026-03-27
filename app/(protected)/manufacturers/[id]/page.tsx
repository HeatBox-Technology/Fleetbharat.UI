"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/CommonCard";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useTheme } from "@/context/ThemeContext";
import { useColor } from "@/context/ColorContext";
import {
  OemManufacturer,
  OemManufacturerFormData,
} from "@/interfaces/oemManufacturers.interface";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import { getCountries } from "@/services/commonServie";
import {
  getOemManufactureById,
  postOemManufacture,
  updateOemManufactureStatus,
  updateOemManufacture,
} from "@/services/oemManufacturersService";

interface Country {
  countryId: number;
  countryName: string;
}

const ManufacturerForm: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();
  const params = useParams();
  const manufacturerId = Number(params.id);
  const isEditMode = manufacturerId > 0;

  const [formData, setFormData] = useState<OemManufacturerFormData>({
    code: "",
    displayName: "",
    officialWebsite: "",
    originCountry: "",
    supportEmail: "",
    supportHotline: "",
    description: "",
    isEnabled: true,
  });
  const [initialFormData, setInitialFormData] =
    useState<OemManufacturerFormData | null>(null);

  const [countries, setCountries] = useState<Country[]>([]);
  const countryOptions = countries.map((country) => ({
    value: country.countryName,
    label: country.countryName,
  }));

  // Fetch countries for the dropdown
  useEffect(() => {
    async function fetchCountries() {
      try {
        const response = await getCountries();
        if (response && Array.isArray(response)) {
          setCountries(response);
        }
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    }
    fetchCountries();
    
    if (isEditMode) {
      (async () => {
        try {
          const response = await getOemManufactureById(manufacturerId);
          const manufacturer: OemManufacturer | null =
            response?.data?.manufacturer ||
            response?.data?.item ||
            response?.data ||
            response?.manufacturer ||
            null;

          if (!manufacturer || typeof manufacturer !== "object") {
            toast.error(response?.message || "Failed to load manufacturer details.");
            return;
          }

          const normalizedData: OemManufacturerFormData = {
            code: manufacturer.code || "",
            displayName: manufacturer.displayName || "",
            officialWebsite: manufacturer.officialWebsite || "",
            originCountry: manufacturer.originCountry || "",
            supportEmail: manufacturer.supportEmail || "",
            supportHotline: manufacturer.supportHotline || "",
            description: manufacturer.description || "",
            isEnabled: manufacturer.isEnabled ?? true,
            createdAt: manufacturer.createdAt || "",
          };

          setFormData(normalizedData);
          setInitialFormData(normalizedData);
        } catch (error) {
          toast.error("Failed to load manufacturer details.");
        }
      })();
    }
  }, [isEditMode, manufacturerId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: target.checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    const payload: OemManufacturerFormData = {
      ...formData,
      code: formData.code.trim(),
      displayName: formData.displayName.trim(),
      officialWebsite: formData.officialWebsite.trim(),
      originCountry: formData.originCountry.trim(),
      supportEmail: formData.supportEmail.trim(),
      supportHotline: formData.supportHotline.trim(),
      description: formData.description.trim(),
    };

    if (!payload.code || !payload.displayName) {
      toast.error("Code and Display Name are required.");
      return;
    }

    if (
      payload.supportEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.supportEmail)
    ) {
      toast.error("Please enter a valid support email.");
      return;
    }

    if (
      payload.officialWebsite &&
      !/^https?:\/\/.+/i.test(payload.officialWebsite)
    ) {
      toast.error("Official Website must start with http:// or https://");
      return;
    }

    try {
      let response;

      if (isEditMode) {
        const hasDetailsChanged =
          initialFormData !== null &&
          (formData.code !== initialFormData.code ||
            formData.displayName !== initialFormData.displayName ||
            formData.officialWebsite !== initialFormData.officialWebsite ||
            formData.originCountry !== initialFormData.originCountry ||
            formData.supportEmail !== initialFormData.supportEmail ||
            formData.supportHotline !== initialFormData.supportHotline ||
            formData.description !== initialFormData.description);
        const hasStatusChanged =
          initialFormData !== null &&
          formData.isEnabled !== initialFormData.isEnabled;

        if (!hasDetailsChanged && hasStatusChanged) {
          response = await updateOemManufactureStatus(
            manufacturerId,
            formData.isEnabled,
          );
        } else {
          response = await updateOemManufacture(manufacturerId, payload);
        }
      } else {
        response = await postOemManufacture(payload);
      }

      if (
        response?.success ||
        response?.statusCode === 200 ||
        response?.statusCode === 201 ||
        response?.statusCode === 204
      ) {
        toast.success(
          response?.message ||
            (isEditMode
              ? "Manufacturer updated successfully!"
              : "Manufacturer entry committed successfully!"),
        );
        router.push("/manufacturers");
        return;
      }

      toast.error(response?.message || "Failed to save manufacturer.");
    } catch (error) {
      toast.error("An error occurred while saving the record.");
    }
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-6`}>
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-6">
          <div className="flex flex-col">
            <h1 className={`text-2xl font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}>
              {isEditMode ? "Edit Record" : "Create Record"}
            </h1>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              OEM Manufacturers Master Entity
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          {/* Identity Details */}
          <Card isDark={isDark}>
            <div className="p-6">
              <h2 className={`text-lg font-bold mb-6 ${isDark ? "text-foreground" : "text-gray-900"}`}>
                Identity Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g. OEM-9001"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="e.g. Teltonika Telematics"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Company Profile */}
          <Card isDark={isDark}>
            <div className="p-6">
              <h2 className={`text-lg font-bold mb-6 ${isDark ? "text-foreground" : "text-gray-900"}`}>
                Company Profile
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Official Website
                  </label>
                  <input
                    type="url"
                    name="officialWebsite"
                    value={formData.officialWebsite}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Origin Country
                  </label>
                  <SearchableDropdown
                    options={countryOptions}
                    value={
                      countryOptions.find(
                        (option) => option.value === formData.originCountry,
                      ) || null
                    }
                    onChange={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        originCountry: String(option?.value || ""),
                      }))
                    }
                    placeholder="Select Country"
                    isDark={isDark}
                    noOptionsMessage="No country found"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Support Email
                  </label>
                  <input
                    type="email"
                    name="supportEmail"
                    value={formData.supportEmail}
                    onChange={handleInputChange}
                    placeholder="support@oem.com"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Support Hotline
                  </label>
                  <input
                    type="tel"
                    name="supportHotline"
                    value={formData.supportHotline}
                    onChange={handleInputChange}
                    placeholder="+00 000 000 000"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>
              <div className="w-full">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Description
                </label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide historical context or technical specifics..."
                  className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                    isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                />
              </div>
            </div>
          </Card>

          {/* Operational Lifecycle Status */}
          <Card isDark={isDark}>
            <div className="p-6">
              <h2 className={`text-lg font-bold mb-2 ${isDark ? "text-foreground" : "text-gray-900"}`}>
                Operational Lifecycle Status
              </h2>
              <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Status determines global visibility in registry selectors.
              </p>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isEnabled"
                    checked={formData.isEnabled}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  <span className={`ml-3 text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {formData.isEnabled ? "Enabled" : "Disabled"}
                  </span>
                </label>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
              onClick={() => router.back()}
            >
              Discard
            </button>
            <button
              className="text-white px-8 py-3 rounded-lg font-medium transition-colors shadow-lg"
              style={{ background: selectedColor }}
              onClick={handleSubmit}
            >
              Commit Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManufacturerForm;
