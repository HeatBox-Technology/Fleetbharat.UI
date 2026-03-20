import React from "react";
import { AlertTriangle, X } from "lucide-react";
import {
  useWhiteLabelColors,
  getContrastTextColor,
} from "@/utils/useWhiteLabelColors";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  isDark?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
  isDark = false,
}) => {
  const { primary, secondary } = useWhiteLabelColors();

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          iconBg: "bg-red-100 dark:bg-red-900/30",
          iconColor: "text-red-600 dark:text-red-400",
          confirmBg: "#dc2626", // red-600
        };
      case "warning":
        return {
          iconBg: "bg-orange-100 dark:bg-orange-900/30",
          iconColor: "text-orange-600 dark:text-orange-400",
          confirmBg: "#ea580c", // orange-600
        };
      case "info":
        return {
          iconBg: "bg-blue-100 dark:bg-blue-900/30",
          iconColor: "text-blue-600 dark:text-blue-400",
          confirmBg: "#2563eb", // blue-600
        };
      default:
        return {
          iconBg: "bg-gray-100 dark:bg-gray-900/30",
          iconColor: "text-gray-600 dark:text-gray-400",
          confirmBg: "#4b5563", // gray-600
        };
    }
  };

  const styles = getTypeStyles();
  const primaryTextColor = getContrastTextColor(primary);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 transform transition-all duration-200 scale-100 opacity-100"
          style={{ backgroundColor: secondary }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button - Primary Color */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg transition-all duration-200 hover:scale-110"
            style={{
              backgroundColor: `${primary}20`, // 20% opacity
              color: primary,
            }}
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-6">
            {/* Icon - Type Based Color */}
            <div className="flex justify-center mb-4">
              <div className={`${styles.iconBg} p-3 rounded-full`}>
                <AlertTriangle className={`w-8 h-8 ${styles.iconColor}`} />
              </div>
            </div>

            {/* Title */}
            <h2
              className="text-xl font-semibold text-center mb-2"
              style={{
                color: isDark ? "#ffffff" : "#1f2937",
              }}
            >
              {title}
            </h2>

            {/* Message */}
            <p
              className="text-center mb-6"
              style={{
                color: isDark ? "#d1d5db" : "#4b5563",
              }}
            >
              {message}
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              {/* Cancel Button - Primary Color */}
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:opacity-90 hover:scale-105"
                style={{
                  backgroundColor: primary,
                  color: primaryTextColor,
                }}
              >
                {cancelText}
              </button>

              {/* Confirm Button - Type Based Color (Danger/Warning/Info) */}
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 hover:scale-105"
                style={{
                  backgroundColor: styles.confirmBg,
                }}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmationDialog;
