"use client";

import { Download, Filter, Home } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import BulkUploadControls from "@/components/BulkUploadControls";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { PageHeaderProps } from "@/interfaces/header.interface";
import {
  getFormRightForPath,
  getPermissionPathFromPathname,
} from "@/services/commonServie";

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs = [],
  showButton = false,
  buttonText = "Add New",
  buttonIcon,
  onButtonClick,
  buttonRoute,
  showExportButton = false,
  ExportbuttonText = "Export",
  onExportClick,
  showFilterButton = false,
  FilterbuttonText = "Filters",
  onFilterClick,
  showWriteButton = true,
  showBulkUpload = false,
  bulkUploadModuleKey,
}) => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();
  const pathname = usePathname();

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    } else if (buttonRoute) {
      router.push(buttonRoute);
    }
  };

  const handleExportClick = () => {
    if (onExportClick) {
      onExportClick();
    }
  };

  const handleFilterClick = () => {
    if (onFilterClick) {
      onFilterClick();
    }
  };
  const [mounted, setMounted] = useState(false);

  const [canShowBulkUpload, setCanShowBulkUpload] = useState(showBulkUpload);
  const [canShowWriteButton, setCanShowWriteButton] = useState(showWriteButton);
  const [canShowExportButton, setCanShowExportButton] =
    useState(showExportButton);

  const getModuleKeyFromPath = (): string => {
    if (!pathname) return "";
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "";

    if (segments[0] === "users" && segments[1] === "roles-permissions") {
      return "roles-permissions";
    }

    if (segments[0] === "users" && segments[1] === "activity-logs") {
      return "activity-logs";
    }

    return segments[0];
  };

  const resolvedModuleKey = bulkUploadModuleKey || getModuleKeyFromPath();

  useEffect(() => {
    const resolveActionPermissions = () => {
      if (typeof window === "undefined") {
        setCanShowBulkUpload(false);
        setCanShowWriteButton(false);
        setCanShowExportButton(false);
        setMounted(true);
        return;
      }

      const matchedRight = getFormRightForPath(pathname || "");
      const normalizedCurrentPath = String(pathname || "")
        .replace(/\/$/, "")
        .toLowerCase();
      const normalizedPermissionPath = getPermissionPathFromPathname(
        pathname || "",
      )
        .replace(/\/$/, "")
        .toLowerCase();
      const isDetailRoute =
        Boolean(normalizedCurrentPath) &&
        normalizedCurrentPath !== normalizedPermissionPath;
      const pathSegments = String(pathname || "")
        .split("/")
        .filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1] || "";
      const isCreateRoute = isDetailRoute && lastSegment === "0";
      const shouldCheckUpdate = isDetailRoute && !isCreateRoute;

      const hasWriteAccess = matchedRight
        ? shouldCheckUpdate
          ? Boolean(matchedRight.canUpdate)
          : Boolean(matchedRight.canWrite)
        : true;
      const hasExportAccess = matchedRight
        ? Boolean(matchedRight.canExport)
        : true;
      const hasBulkAccess = matchedRight ? matchedRight.isBulk !== false : true;

      setCanShowWriteButton(showWriteButton && hasWriteAccess);
      setCanShowExportButton(showExportButton && hasExportAccess);
      setCanShowBulkUpload(showBulkUpload && hasBulkAccess);
      setMounted(true);
    };

    resolveActionPermissions();
  }, [pathname, showBulkUpload, showWriteButton, showExportButton]);

  return (
    <>
      {/* Breadcrumb */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 md:mb-6 text-xs sm:text-sm overflow-x-auto scrollbar-hide pb-1">
          <Home
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${isDark ? "text-gray-400" : "text-gray-500"}`}
          />
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              <span
                className={`flex-shrink-0 ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                ›
              </span>
              {item.href ? (
                <button
                  onClick={() => router.push(item.href!)}
                  className={`whitespace-nowrap ${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-600"} transition-colors`}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={`whitespace-nowrap ${
                    index === breadcrumbs.length - 1
                      ? isDark
                        ? "text-foreground"
                        : "text-gray-900"
                      : isDark
                        ? "text-gray-400"
                        : "text-gray-500"
                  }`}
                >
                  {item.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 mb-4 sm:mb-6 md:mb-8">
        {/* Title Section */}
        <div className="flex-1 min-w-0">
          <h1
            className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 ${isDark ? "text-foreground" : "text-gray-900"}`}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={`text-xs sm:text-sm md:text-base ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {(showFilterButton ||
          canShowExportButton ||
          (showButton && canShowWriteButton) ||
          canShowBulkUpload) && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Filters Button */}
            {showFilterButton && (
              <button
                onClick={handleFilterClick}
                className={`cursor-pointer px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition-colors border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{FilterbuttonText}</span>
              </button>
            )}

            {/* Export Button */}
            {canShowExportButton && (
              <button
                onClick={handleExportClick}
                className={`cursor-pointer px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition-colors border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{ExportbuttonText}</span>
              </button>
            )}

            {mounted && canShowBulkUpload && (
              <BulkUploadControls moduleKey={resolvedModuleKey} />
            )}

            {/* Primary Action Button */}
            {showButton && canShowWriteButton && (
              <button
                onClick={handleButtonClick}
                style={{ background: selectedColor }}
                className="cursor-pointer hover:opacity-90 text-white px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition-opacity ml-auto"
              >
                <span className="whitespace-nowrap">{buttonText}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default PageHeader;
