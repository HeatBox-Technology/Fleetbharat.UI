"use client";

import React, { useState } from "react";
import { Layers } from "lucide-react";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import ThemeCustomizer from "@/components/ThemeCustomizer";

const AddCategory: React.FC = () => {
  const { selectedColor } = useColor();
  const { isDark } = useTheme();
  const router = useRouter();
  const [isActive, setIsActive] = useState(true);
  const [labelName, setLabelName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    console.log({
      labelName,
      description,
      isActive,
    });
    // Add your submit logic here
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div className="min-h-screen bg-background flex justify-center p-2">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-20 mb-6 px-4 sm:px-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              New Classification
            </h1>

            <button
              onClick={handleCancel}
              className="text-foreground hover:text-foreground/70 font-medium transition-colors w-full sm:w-auto text-center sm:text-right"
            >
              Cancel
            </button>
          </div>

          {/* Form Card */}
          <div
            className="bg-card rounded-2xl shadow-lg border-t-4 border-border overflow-hidden"
            style={{ borderTopColor: selectedColor }}
          >
            <div className="p-8">
              {/* Section Header */}
              <div className="flex items-start gap-3 mb-6">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${selectedColor}20` }}
                >
                  <Layers
                    className="w-5 h-5"
                    style={{ color: selectedColor }}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    Taxonomy Parameters
                  </h2>
                  <p className="text-sm text-foreground opacity-60">
                    Create a new grouping for account management and pricing.
                  </p>
                </div>
              </div>

              {/* Label Name Field */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Label Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Platinum Partner"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                    isDark
                      ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  onFocus={(e) => (e.target.style.borderColor = selectedColor)}
                  onBlur={(e) => (e.target.style.borderColor = "")}
                />
              </div>

              {/* Description Field */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Define the purpose and scope of this account category..."
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
                />
              </div>

              {/* Category Status Toggle */}
              <div className="bg-background rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1">
                      Category Status
                    </h3>
                    <p className="text-sm text-foreground opacity-60">
                      Inactive categories cannot be assigned to new accounts.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsActive(!isActive)}
                    className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
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
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  className="px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: selectedColor }}
                >
                  Create Category
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ThemeCustomizer />
    </div>
  );
};

export default AddCategory;
