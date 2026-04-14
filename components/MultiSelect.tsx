"use client";

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";

export interface OptionType {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: OptionType[];
  value: OptionType[];
  onChange: (value: OptionType[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  isDisabled?: boolean;
  name?:string
}

const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || !hex.startsWith("#")) return `rgba(99, 102, 241, ${alpha})`;
  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const MultiSelect = ({
  options,
  value,
  onChange,
  placeholder = "Select options",
  searchPlaceholder = "Search...",
  isDisabled = false,
  name="Select All"
}: MultiSelectProps) => {
  const { selectedColor } = useColor();
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const primaryColor = selectedColor || "#6366f1";
  const borderColor = isDark ? "#334155" : "#cbd5e1";
  const surfaceColor = isDark ? "#0f172a" : "hsl(var(--background))";
  const textColor = isDark ? "#e2e8f0" : "#0f172a";
  const mutedColor = isDark ? "#94a3b8" : "#64748b";
  const selectedBg = hexToRgba(primaryColor, isDark ? 0.3 : 0.16);
  const optionHoverBg = hexToRgba(primaryColor, isDark ? 0.2 : 0.1);
  const allSelected = options.length > 0 && value.length === options.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleOption = (option: OptionType) => {
    const exists = value.some((v) => v.value === option.value);
    if (exists) {
      onChange(value.filter((v) => v.value !== option.value));
    } else {
      onChange([...value, option]);
    }
  };

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
      return;
    }
    onChange(options);
  };

  const handleToggleOpen = () => {
    if (!isDisabled) {
      setOpen((current) => !current);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={handleToggleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleOpen();
          }
        }}
        role="combobox"
        tabIndex={isDisabled ? -1 : 0}
        aria-disabled={isDisabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`rounded-2xl border px-3 py-2 flex items-center shadow-sm transition ${
          isDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
        }`}
        style={{
          backgroundColor: isDisabled
            ? isDark
              ? "#0b1220"
              : "#f3f4f6"
            : surfaceColor,
          borderColor: open ? primaryColor : borderColor,
          boxShadow: open ? `0 0 0 3px ${hexToRgba(primaryColor, 0.2)}` : "none",
        }}
      >
        <div className="flex max-h-[72px] min-h-[28px] w-full flex-wrap items-center gap-2 overflow-y-auto pr-1">
          {value.length === 0 && (
            <span className="self-center" style={{ color: mutedColor }}>
              {placeholder}
            </span>
          )}

          {value.map((item) => (
            <span
              key={item.value}
              className="flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-sm"
              style={{
                backgroundColor: selectedBg,
                color: textColor,
                border: `1px solid ${hexToRgba(primaryColor, isDark ? 0.5 : 0.28)}`,
              }}
            >
              <span className="truncate">{item.label}</span>
              {!isDisabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(value.filter((v) => v.value !== item.value));
                  }}
                  className="leading-none"
                >
                  x
                </button>
              )}
            </span>
          ))}
        </div>
        <ChevronDown
          size={16}
          className={`ml-2 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: mutedColor }}
        />
      </div>

      {open && !isDisabled && (
        <div
          className="absolute z-20 mt-2 w-full rounded-2xl border shadow-xl"
          style={{
            borderColor,
            backgroundColor: surfaceColor,
          }}
        >
          <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor }}>
            <Search size={16} style={{ color: mutedColor }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-sm outline-none bg-transparent"
              style={{ color: textColor }}
            />
          </div>

          <div className="max-h-64 overflow-auto">
            <label
              className="flex cursor-pointer items-center gap-3 px-3 py-2 m-2 rounded-lg"
              style={{
                backgroundColor: allSelected ? optionHoverBg : "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = optionHoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = allSelected
                  ? optionHoverBg
                  : "transparent";
              }}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                style={{ accentColor: primaryColor }}
              />
              <span style={{ color: textColor, fontWeight: 600 }}>
               {name} - {options.length} options
              </span>
            </label>

            {filteredOptions.length === 0 && (
              <p className="px-3 py-2 text-sm" style={{ color: mutedColor }}>
                No options found
              </p>
            )}

            {filteredOptions.map((option) => {
              const checked = value.some((v) => v.value === option.value);

              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 rounded-lg mx-2"
                  style={{
                    backgroundColor: checked ? optionHoverBg : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = optionHoverBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = checked
                      ? optionHoverBg
                      : "transparent";
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOption(option)}
                    style={{ accentColor: primaryColor }}
                  />
                  <span style={{ color: textColor }}>{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
