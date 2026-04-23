"use client";

import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import { Card } from "@/components/CommonCard";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getNetworkProviderById,
  postNetworkProvider,
  updateNetworkProvider,
  updateNetworkProviderStatus,
} from "@/services/networkProviderService";
import type {
  NetworkProviderFormData,
} from "@/interfaces/networkProvider.interface";

interface NetworkProviderServiceResponse {
  success?: boolean;
  statusCode?: number;
  message?: string;
}

const NetworkProviderForm: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();
  const params = useParams();
  const providerId = Number(params.id);
  const isEditMode = providerId > 0;

  const [formData, setFormData] = useState<NetworkProviderFormData>({
    code: "",
    displayName: "",
    description: "",
    isEnabled: true,
  });
  const [initialFormData, setInitialFormData] =
    useState<NetworkProviderFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      (async () => {
        try {
          setFetchingData(true);
          const response = await getNetworkProviderById(providerId);
          const provider =
            response?.data?.provider ||
            response?.data?.item ||
            response?.data ||
            response?.provider ||
            null;

          if (!provider || typeof provider !== "object") {
            toast.error(response?.message || "Failed to load network provider details.");
            return;
          }

          const normalizedData: NetworkProviderFormData = {
            code: provider.code || "",
            displayName: provider.displayName || "",
            description: provider.description || "",
            isEnabled: provider.isEnabled ?? true,
          };

          setFormData(normalizedData);
          setInitialFormData(normalizedData);
        } catch (_error) {
          toast.error("Failed to load network provider details.");
        } finally {
          setFetchingData(false);
        }
      })();
    }
  }, [isEditMode, providerId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
    const payload: NetworkProviderFormData = {
      ...formData,
      code: formData.code.trim(),
      displayName: formData.displayName.trim(),
      description: formData.description.trim(),
    };

    if (!payload.code || !payload.displayName) {
      toast.error("Code and Display Name are required.");
      return;
    }

    try {
      setLoading(true);
      let response: NetworkProviderServiceResponse | null = null;

      if (isEditMode) {
        const hasDetailsChanged =
          initialFormData !== null &&
          (payload.code !== initialFormData.code ||
            payload.displayName !== initialFormData.displayName ||
            payload.description !== initialFormData.description);
        const hasStatusChanged =
          initialFormData !== null &&
          payload.isEnabled !== initialFormData.isEnabled;

        if (!hasDetailsChanged && hasStatusChanged) {
          response = await updateNetworkProviderStatus(providerId, payload.isEnabled);
        } else {
          response = await updateNetworkProvider(providerId, payload);
        }
      } else {
        response = await postNetworkProvider(payload);
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
              ? "Network provider updated successfully!"
              : "Network provider entry committed successfully!"),
        );
        router.push("/network-providers");
        return;
      }

      toast.error(response?.message || "Failed to save network provider.");
    } catch (_error) {
      toast.error("An error occurred while saving the record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-6`}>
        <ActionLoader
          isVisible={fetchingData || loading}
          text={
            fetchingData
              ? "Loading network provider details..."
              : isEditMode
                ? "Updating network provider..."
                : "Creating network provider..."
          }
        />
        
        {/* Header Section */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex flex-col">
            <h1 className={`text-2xl font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}>
              {isEditMode ? "Edit Record" : "Create Record"}
            </h1>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Network Providers Master Entity
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Identity Details Section */}
          <Card isDark={isDark}>
            <div className="p-6">
              <h2 className={`text-lg font-bold mb-6 ${isDark ? "text-foreground" : "text-gray-900"}`}>
                Identity Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Code Field */}
                <div>
                  <label
                    htmlFor="network-provider-code"
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="network-provider-code"
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g. NET-VOD"
                    required
                    aria-required="true"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>

                {/* Display Name Field */}
                <div>
                  <label
                    htmlFor="network-provider-display-name"
                    className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="network-provider-display-name"
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="e.g. Vodafone"
                    required
                    aria-required="true"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>

              {/* Description Field */}
              <div className="w-full">
                <label
                  htmlFor="network-provider-description"
                  className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  Description
                </label>
                <textarea
                  id="network-provider-description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide historical context or technical specifics..."
                  className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                    isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                />
              </div>
            </div>
          </Card>

          {/* Operational Lifecycle Status Section */}
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
                  {/* Toggle UI */}
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  <span className={`ml-3 text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Enabled
                  </span>
                </label>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isDark 
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700" 
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
              onClick={() => router.back()}
            >
              Discard
            </button>
            <button
              type="button"
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

export default NetworkProviderForm;