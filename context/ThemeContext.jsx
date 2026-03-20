"use client";
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [primaryHsl, setPrimaryHsl] = useState("239 68% 55%");

  // ✅ Initialize values on client side only
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDark = localStorage.getItem("darkMode");
      const savedPrimary = localStorage.getItem("primaryHsl");

      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;

      // setIsDark(savedDark !== null ? savedDark === "true" : prefersDark);
      setPrimaryHsl(savedPrimary || "239 68% 55%");
    }
  }, []);

  // ✅ Apply dark mode dynamically
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("darkMode", isDark);
    }
  }, [isDark]);

  // ✅ Apply custom primary color
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.style.setProperty("--primary", primaryHsl);
      localStorage.setItem("primaryHsl", primaryHsl);
    }
  }, [primaryHsl]);

  return (
    <ThemeContext.Provider
      value={{ isDark, setIsDark, primaryHsl, setPrimaryHsl }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
