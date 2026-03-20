import { useEffect, useState } from "react";

interface WhiteLabelSettings {
  whiteLabelId: number;
  customEntryFqdn: string;
  logoUrl: string;
  primaryColorHex: string;
  secondaryColorHex: string;
}

interface WhiteLabelColors {
  primary: string;
  secondary: string;
}

/**
 * Custom hook to get white label colors from localStorage
 * Returns primary and secondary colors, with fallback defaults
 */
export const useWhiteLabelColors = (): WhiteLabelColors => {
  const [colors, setColors] = useState<WhiteLabelColors>({
    primary: "#30c5e3",
    secondary: "#ffffff",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const whiteLabelData = localStorage.getItem("whiteLabelSettings");
        if (whiteLabelData) {
          const settings: WhiteLabelSettings = JSON.parse(whiteLabelData);
          setColors({
            primary: settings.primaryColorHex || "#30c5e3",
            secondary: settings.secondaryColorHex || "#ffffff",
          });
        }
      } catch (error) {
        console.error("Error loading white label settings:", error);
      }
    }
  }, []);

  return colors;
};

/**
 * Helper function to determine if a color is light or dark
 * Returns appropriate text color for contrast
 */
export const getContrastTextColor = (hexColor: string): string => {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "#000000" : "#ffffff";
};

/**
 * Helper function to add opacity to a hex color
 * @param hexColor - The hex color (e.g., "#30c5e3")
 * @param opacity - Opacity value between 0 and 1 (e.g., 0.2)
 * @returns RGBA color string
 */
export const hexToRgba = (hexColor: string, opacity: number): string => {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Helper function to lighten or darken a color
 * @param hexColor - The hex color
 * @param percent - Percentage to lighten (positive) or darken (negative)
 * @returns Hex color string
 */
export const adjustColorBrightness = (
  hexColor: string,
  percent: number,
): string => {
  const hex = hexColor.replace("#", "");
  const r = Math.max(
    0,
    Math.min(255, parseInt(hex.substr(0, 2), 16) + (255 * percent) / 100),
  );
  const g = Math.max(
    0,
    Math.min(255, parseInt(hex.substr(2, 2), 16) + (255 * percent) / 100),
  );
  const b = Math.max(
    0,
    Math.min(255, parseInt(hex.substr(4, 2), 16) + (255 * percent) / 100),
  );

  const rr = Math.round(r).toString(16).padStart(2, "0");
  const gg = Math.round(g).toString(16).padStart(2, "0");
  const bb = Math.round(b).toString(16).padStart(2, "0");

  return `#${rr}${gg}${bb}`;
};

/**
 * Get white label settings directly from localStorage
 * Useful for non-React contexts
 */
export const getWhiteLabelSettings = (): WhiteLabelSettings | null => {
  if (typeof window === "undefined") return null;

  try {
    const whiteLabelData = localStorage.getItem("whiteLabelSettings");
    if (whiteLabelData) {
      return JSON.parse(whiteLabelData);
    }
  } catch (error) {
    console.error("Error loading white label settings:", error);
  }

  return null;
};

/**
 * Save white label settings to localStorage
 */
export const setWhiteLabelSettings = (
  settings: WhiteLabelSettings,
): boolean => {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem("whiteLabelSettings", JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error("Error saving white label settings:", error);
    return false;
  }
};
