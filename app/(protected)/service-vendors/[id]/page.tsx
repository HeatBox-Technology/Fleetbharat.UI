"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/CommonCard";
import ActionLoader from "@/components/ActionLoader";
import { useTheme } from "@/context/ThemeContext";
import { useColor } from "@/context/ColorContext";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
// Import Service Vendor Services
import { 
  getServiceVendorById, 
  postServiceVendor, 
  updateServiceVendor 
} from "@/services/serviceVendorService";

interface ServiceVendorFormData {
  code: string;
  displayName: string;
  description: string;
  isEnabled: boolean;
}

const ServiceVendorForm: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();
  const params = useParams();
  const isEditMode = params.id !== "0";

  const [formData, setFormData] = useState<ServiceVendorFormData>({
    code: "",
    displayName: "",
    description: "",
    isEnabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      (async () => {
        try {
          setFetchingData(true);
          const response = await getServiceVendorById(Number(params.id));
          if (response.success || response.statusCode === 200) {
            setFormData({
              code: response.data.code,
              displayName: response.data.displayName,
              description: response.data.description,
              isEnabled: response.data.isEnabled,
            });
          }
        } finally {
          setFetchingData(false);
        }
      })();
    }
  }, [isEditMode, params.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.displayName) {
      toast.error("Code and Display Name are required!");
      return;
    }

    try {
      setLoading(true);
      const response = isEditMode 
        ? await updateServiceVendor(Number(params.id), formData)
        : await postServiceVendor(formData);
      
      if (response.success || response.statusCode === 200) {
        toast.success(response.message || "Record saved successfully!");
        router.push("/service-vendors");
      } else {
        toast.error(response.message || "Failed to save");
      }
    } catch (error) {
      toast.error("An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-6`}>
        <ActionLoader
          isVisible={fetchingData || loading}
          text={fetchingData ? "Loading details..." : "Saving..."}
        />
        
        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex flex-col">
            <h1 className={`text-2xl font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}>
              {isEditMode ? "Edit Record" : "Create Record"}
            </h1>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Service Vendors Master Entity
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <Card isDark={isDark}>
            <div className="p-6">
              <h2 className={`text-lg font-bold mb-6 ${isDark ? "text-foreground" : "text-gray-900"}`}>
                Identity Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" name="code" value={formData.code} onChange={handleInputChange}
                    placeholder="e.g. VEND-001"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" name="displayName" value={formData.displayName} onChange={handleInputChange}
                    placeholder="e.g. Acme Maintenance"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>
              <div className="w-full">
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Description</label>
                <textarea
                  name="description" rows={4} value={formData.description} onChange={handleInputChange}
                  placeholder="Provide context details..."
                  className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                    isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                />
              </div>
            </div>
          </Card>

          <Card isDark={isDark}>
            <div className="p-6">
              <h2 className={`text-lg font-bold mb-2 ${isDark ? "text-foreground" : "text-gray-900"}`}>Operational Lifecycle Status</h2>
              <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Status determines global visibility in registry selectors.</p>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="isEnabled" checked={formData.isEnabled} onChange={handleInputChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  <span className={`ml-3 text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>Enabled</span>
                </label>
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button" onClick={() => router.back()}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              Discard
            </button>
            <button
              type="button" onClick={handleSubmit}
              className="text-white px-8 py-3 rounded-lg font-medium transition-colors shadow-lg"
              style={{ background: selectedColor }}
            >
              Commit Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceVendorForm;