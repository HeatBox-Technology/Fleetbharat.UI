"use client";

import { useEffect } from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { LayoutProvider } from "@/context/LayoutContext";
import { ColorProvider } from "@/context/ColorContext";
import { AuthProvider } from "@/context/AuthContext";
import ToastProvider from "@/providers/ToastProvider";
import AutoLocaleText from "@/providers/AutoLocaleText";
import { applyWhiteLabelColors } from "@/utils/themeUtils";

export default function RootClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <AuthProvider>
      <ThemeProvider>
        <LayoutProvider>
          <ColorProvider>
            <AutoLocaleText />
            {children}
            <ToastProvider />
          </ColorProvider>
        </LayoutProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
