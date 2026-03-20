"use client";

import React from "react";
import { Home } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useColor } from "@/context/ColorContext";
import { useRouter } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  showButton?: boolean;
  buttonText?: string;
  buttonIcon?: React.ReactNode;
  onButtonClick?: () => void;
  buttonRoute?: string;
}

const TableHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs = [],
  showButton = false,
  buttonText = "Add New",
  buttonIcon,
  onButtonClick,
  buttonRoute,
}) => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    } else if (buttonRoute) {
      router.push(buttonRoute);
    }
  };

  return (
    <>
      {/* Breadcrumb */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 text-xs sm:text-sm overflow-x-auto">
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="flex-1 min-w-0">
          <h1
            className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 ${isDark ? "text-foreground" : "text-gray-900"}`}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={`text-sm sm:text-base ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              {subtitle}
            </p>
          )}
        </div>
        {showButton && (
          <button
            onClick={handleButtonClick}
            style={{ background: selectedColor }}
            className="cursor-pointer hover:opacity-90 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-opacity text-sm sm:text-base whitespace-nowrap flex-shrink-0"
          >
            {buttonIcon || <span className="text-lg sm:text-xl">+</span>}
            <span className="hidden xs:inline sm:inline">{buttonText}</span>
            <span className="inline xs:hidden sm:hidden">Add</span>
          </button>
        )}
      </div>
    </>
  );
};

export default TableHeader;
