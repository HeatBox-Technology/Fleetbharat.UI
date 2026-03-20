"use client";

import type { CSSObjectWithLabel, GroupBase, StylesConfig } from "react-select";
import Select from "react-select";

export interface SearchableOption {
  label: string;
  value: string | number;
  description?: string;
}

interface SearchableDropdownProps {
  options: SearchableOption[];
  value: SearchableOption | null;
  onChange: (option: SearchableOption | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  isClearable?: boolean;
  isDark?: boolean;
  noOptionsMessage?: string;
}

const createStyles = (
  isDark: boolean,
): StylesConfig<SearchableOption, false> => {
  const textColor = isDark ? "#e2e8f0" : "#0f172a";
  const borderColor = isDark ? "#334155" : "#cbd5e1";
  const bgColor = isDark ? "#0f172a" : "#ffffff";
  const mutedColor = isDark ? "#94a3b8" : "#64748b";

  const commonControl: CSSObjectWithLabel = {
    minHeight: 44,
    borderRadius: 12,
    borderColor,
    backgroundColor: bgColor,
    boxShadow: "none",
    transition: "all 0.15s ease",
  };

  return {
    control: (base, state) => ({
      ...base,
      ...commonControl,
      borderColor: state.isFocused ? "#06b6d4" : borderColor,
      boxShadow: state.isFocused ? "0 0 0 3px rgba(6, 182, 212, 0.20)" : "none",
      "&:hover": {
        borderColor: state.isFocused ? "#06b6d4" : borderColor,
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "2px 10px",
    }),
    input: (base) => ({
      ...base,
      color: textColor,
      margin: 0,
      padding: 0,
    }),
    singleValue: (base) => ({
      ...base,
      color: textColor,
      fontWeight: 600,
      fontSize: 14,
    }),
    placeholder: (base) => ({
      ...base,
      color: mutedColor,
      fontSize: 14,
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isFocused ? "#06b6d4" : mutedColor,
      padding: 8,
    }),
    clearIndicator: (base) => ({
      ...base,
      color: mutedColor,
      padding: 8,
    }),
    menu: (base) => ({
      ...base,
      borderRadius: 12,
      overflow: "hidden",
      border: `1px solid ${borderColor}`,
      backgroundColor: bgColor,
      boxShadow: isDark
        ? "0 10px 25px rgba(2, 6, 23, 0.55)"
        : "0 10px 25px rgba(15, 23, 42, 0.12)",
      zIndex: 40,
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    menuList: (base) => ({
      ...base,
      maxHeight: 240,
      padding: 6,
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: 10,
      cursor: "pointer",
      fontSize: 14,
      color: textColor,
      backgroundColor: state.isFocused
        ? isDark
          ? "#1e293b"
          : "#eef9ff"
        : state.isSelected
          ? isDark
            ? "#164e63"
            : "#cffafe"
          : "transparent",
      padding: "10px 12px",
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: mutedColor,
      fontSize: 13,
      padding: "10px 12px",
    }),
  };
};

const SearchableDropdown = ({
  options,
  value,
  onChange,
  placeholder = "Select option",
  isDisabled = false,
  isLoading = false,
  isClearable = false,
  isDark = false,
  noOptionsMessage = "No options found",
}: SearchableDropdownProps) => {
  const portalTarget =
    typeof window !== "undefined" ? document.body : undefined;

  return (
    <Select<SearchableOption, false, GroupBase<SearchableOption>>
      options={options}
      value={value}
      onChange={(option) => onChange(option)}
      isSearchable={true}
      isDisabled={isDisabled}
      isLoading={isLoading}
      isClearable={isClearable}
      placeholder={placeholder}
      noOptionsMessage={() => noOptionsMessage}
      styles={createStyles(isDark)}
      menuPortalTarget={portalTarget}
      menuPosition="fixed"
      menuShouldScrollIntoView={false}
      menuShouldBlockScroll={false}
      formatOptionLabel={(option) => (
        <div>
          <div className="font-semibold leading-5">{option.label}</div>
          {option.description ? (
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {option.description}
            </div>
          ) : null}
        </div>
      )}
    />
  );
};

export default SearchableDropdown;
