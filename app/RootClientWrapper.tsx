"use client";

import { useEffect, useState } from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { LayoutProvider } from "@/context/LayoutContext";
import { ColorProvider } from "@/context/ColorContext";
import { AuthProvider } from "@/context/AuthContext";
import ToastProvider from "@/providers/ToastProvider";
import AutoLocaleText from "@/providers/AutoLocaleText";
import { applyWhiteLabelColors } from "@/utils/themeUtils";
import SessionExpiredModal from "@/components/SessionExpiredModal";
import { SESSION_EXPIRED_EVENT } from "@/services/apiService";

export default function RootClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("whiteLabelTheme");
    if (savedTheme) {
      try {
        applyWhiteLabelColors(JSON.parse(savedTheme));
      } catch (err) {
        console.error("Error applying saved theme:", err);
      }
    }
  }, []);

  useEffect(() => {
    const openSessionExpiredModal = () => {
      setShowSessionExpired(true);
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, openSessionExpiredModal);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, openSessionExpiredModal);
    };
  }, []);

  const handleSessionAcknowledge = () => {
    setShowSessionExpired(false);
    window.location.href = "/";
  };

  return (
    <AuthProvider>
      <ThemeProvider>
        <LayoutProvider>
          <ColorProvider>
            <AutoLocaleText />
            {children}
            <ToastProvider />
            <SessionExpiredModal
              isOpen={showSessionExpired}
              onAcknowledge={handleSessionAcknowledge}
            />
          </ColorProvider>
        </LayoutProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
