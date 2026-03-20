"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/CommonCard";
import { useTheme } from "@/context/ThemeContext";
import { useColor } from "@/context/ColorContext";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";

// Define the shape of Vehicle Brand data
interface VehicleBrandFormData {
  code: string;
  displayName: string;
  description: string;
  isEnabled: boolean;
}

const VehicleBrandForm: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();
  const params = useParams();
  
  // Check if we are editing or creating
  const isEditMode = params.id !== "0";

  const [formData, setFormData] = useState<VehicleBrandFormData>({
    code: "",
    displayName: "",
    description: "",
    isEnabled: true,
  });

  useEffect(() => {
    if (isEditMode) {
      // Fetch existing Vehicle Brand data if needed
      console.log("Fetching details for Vehicle Brand ID:", params.id);
    }
  }, [isEditMode, params.id]);

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
    // Validation
    if (!formData.code || !formData.displayName) {
      toast.error("Code and Display Name are required!");
      return;
    }

    try {
      console.log("Submitting Vehicle Brand Entry:", formData);
      
      // Replace with your service call, e.g.:
      // const response = await saveVehicleBrand(formData);
      
      toast.success("Vehicle Brand committed successfully!");
      router.push("/vehicle-brands");
    } catch (error) {
      toast.error("An error occurred while saving the record.");
    }
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-6`}>
        
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex flex-col">
            <h1 className={`text-2xl font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}>
              {isEditMode ? "Edit Record" : "Create Record"}
            </h1>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Vehicle Brands Master Entity
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Identity Details Card */}
          <Card isDark={isDark}>
            <div className="p-6">
              <h2 className={`text-lg font-bold mb-6 ${isDark ? "text-foreground" : "text-gray-900"}`}>
                Identity Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Code */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g. BR-TOY"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>

                {/* Display Name */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="e.g. Toyota"
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  />
                </div>
              </div>

              {/* Description */}
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
                    isDark ? "bg-gray-800 border-gray-700 text-foreground" : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                />
              </div>
            </div>
          </Card>

          {/* Status Card */}
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

export default VehicleBrandForm;