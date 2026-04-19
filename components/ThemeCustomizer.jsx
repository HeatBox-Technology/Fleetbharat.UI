"use client";
import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useTheme } from "../context/ThemeContext";
import { useLayout } from "../context/LayoutContext";
import { useColor } from "../context/ColorContext";
import { buildLocalePath } from "@/i18n/localePath";

const presetColors = [
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
];

export default function ThemeCustomizer() {
  const { isDark, setIsDark, setPrimaryHsl } = useTheme();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { layout, setLayout } = useLayout();
  const activeLocale = useLocale();
  const [locale, setLocale] = useState(activeLocale);

  const {
    selectedColor,
    handleColorChange,
    colorBlock,
    setColorBlock,
    hexToHsl,
  } = useColor();

  // ✅ detect screen width for responsive logic
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setLocale(activeLocale);
  }, [activeLocale]);

  const handlePresetColor = (hex) => {
    handleColorChange(hex);
    setPrimaryHsl(hexToHsl(hex));
  };

  const handleLocaleChange = (nextLocale) => {
    setLocale(nextLocale);
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    const nextPath = buildLocalePath(nextLocale, window.location.pathname || "/");
    window.location.href = `${nextPath}${window.location.search}`;
  };

  // Hide on route master add/edit page only
  if (pathname?.includes("/route-master/")) {
    return null;
  }

  // Closed state button (floating gear)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed z-50 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition
        ${isMobile ? "bottom-6 right-6" : "top-1/2 right-8 -translate-y-1/2"}`}
        style={{ backgroundColor: selectedColor }}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    );
  }

  // Open panel
  return (
    <div
      className={`fixed z-50 shadow-2xl border rounded-2xl overflow-hidden transition-all duration-300
      ${
        isMobile
          ? "bottom-0 left-0 right-0 w-full rounded-t-2xl"
          : "top-1/2 right-8 -translate-y-1/2 w-80"
      }
      ${isDark ? "bg-gray-950 text-white border-gray-800" : "bg-white text-gray-900 border-gray-200"}`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-5 py-4 border-b ${
          isDark ? "border-gray-800" : "border-gray-200"
        }`}
      >
        <h3 className="text-base font-semibold">Theme Customizer</h3>
        <button
          onClick={() => setIsOpen(false)}
          className={`transition text-lg ${
            isDark
              ? "text-gray-400 hover:text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Color Palette */}
        {/* <div>
          <label
            className={`block text-xs font-medium mb-3 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Color
          </label>
          <div className="grid grid-cols-4 gap-3">
            {presetColors.map((color) => (
              <button
                key={color}
                onClick={() => handlePresetColor(color)}
                className="w-full h-10 rounded-md transition-all relative flex items-center justify-center"
                style={{
                  backgroundColor: "#f1f5f980",
                  border:
                    selectedColor === color
                      ? `2px solid ${color}`
                      : "1px solid gray",
                }}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {selectedColor === color && (
                  <div
                    className="absolute w-6 h-6 rounded-full border-2"
                    style={{ borderColor: color }}
                  />
                )}
              </button>
            ))}
          </div>
        </div> */}

        {/* Menu Layout */}
        <div>
          <label
            className={`block text-xs font-medium mb-3 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Language
          </label>
          <select
            value={locale}
            onChange={(e) => handleLocaleChange(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm ${
              isDark
                ? "bg-gray-900 border-gray-700 text-gray-100"
                : "bg-white border-gray-300 text-gray-800"
            }`}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="te">Telugu</option>
            <option value="ta">Tamil</option>
            <option value="kn">Kannada</option>
          </select>
        </div>

        {/* Menu Layout */}
        <div>
          <label
            className={`block text-xs font-medium mb-3 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Menu Layout
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setLayout("sidebar")}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all border-2 ${
                layout === "sidebar"
                  ? "text-primary-foreground border-primary"
                  : isDark
                    ? "border-gray-700 text-gray-400 hover:border-gray-600"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
              style={
                layout === "sidebar"
                  ? {
                      backgroundColor: selectedColor,
                      borderColor: selectedColor,
                    }
                  : {}
              }
            >
              <span className="mr-1.5">⊞</span> Sidebar
            </button>

            {/* Top Nav button — disabled on mobile */}
            <button
              onClick={() => !isMobile && setLayout("topnav")}
              disabled={isMobile}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                isMobile
                  ? "opacity-50 cursor-not-allowed"
                  : layout === "topnav"
                    ? "text-primary-foreground border-primary"
                    : isDark
                      ? "border-gray-700 text-gray-400 hover:border-gray-600"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
              style={
                layout === "topnav" && !isMobile
                  ? {
                      backgroundColor: selectedColor,
                      borderColor: selectedColor,
                    }
                  : {}
              }
            >
              <span className="mr-1.5">▭</span> Top Nav
            </button>
          </div>
        </div>

        {/* Sidebar Style Toggle */}
        <div>
          <label
            className={`block text-xs font-medium mb-3 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Sidebar Style
          </label>
          <div
            className={`flex items-center justify-between border rounded-lg px-4 py-3 ${
              isDark ? "border-gray-800" : "border-gray-200"
            }`}
          >
            <span className="text-sm">Color Block</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={colorBlock}
                onChange={(e) => setColorBlock(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-md ${
                  isDark ? "bg-gray-700" : "bg-gray-300"
                }`}
                style={colorBlock ? { backgroundColor: selectedColor } : {}}
              ></div>
            </label>
          </div>
        </div>

        {/* Dark Mode Toggle */}
        <div>
          <label
            className={`block text-xs font-medium mb-3 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Mode
          </label>
          <div
            className={`flex items-center justify-between border rounded-lg px-4 py-3 ${
              isDark ? "border-gray-800" : "border-gray-200"
            }`}
          >
            <span className="text-sm">Dark Mode</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDark}
                onChange={(e) => setIsDark(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-md ${
                  isDark ? "bg-gray-700" : "bg-gray-300"
                }`}
                style={isDark ? { backgroundColor: selectedColor } : {}}
              ></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
