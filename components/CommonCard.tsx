// components/CommonCard.tsx

import Image, { StaticImageData } from "next/image";
import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  isDark: boolean;
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }> | StaticImageData | string;
  label: string;
  value: number | string;
  iconBgColor: string;
  iconColor: string;
  isDark: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  isDark,
}) => (
  <div
    className={`${
      isDark
        ? "bg-card border border-gray-800"
        : "bg-white border border-gray-200"
    } rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-4 sm:p-6 ${className}`}
  >
    {children}
  </div>
);

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  iconBgColor,
  iconColor,
  isDark,
}) => {
  const renderIcon = () => {
    // Check if it's a string (URL)
    if (typeof icon === "string") {
      return (
        <img
          src={icon}
          alt={label}
          className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
        />
      );
    }

    // Check if it's a StaticImageData (imported image)
    if (typeof icon === "object" && "src" in icon) {
      return (
        <Image
          src={icon as StaticImageData}
          alt={label}
          className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
        />
      );
    }

    // Otherwise, it's a React component (Lucide icon)
    const IconComponent = icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />;
  };

  return (
    <Card isDark={isDark}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          className={`${iconBgColor} w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0`}
        >
          {renderIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-500"} mb-0.5 sm:mb-1`}
          >
            {label}
          </p>
          <p
            className={`text-lg sm:text-xl md:text-2xl font-bold ${
              isDark ? "text-foreground" : "text-gray-900"
            }`}
          >
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
};
