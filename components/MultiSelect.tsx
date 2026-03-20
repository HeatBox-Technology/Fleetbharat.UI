"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
}

const MultiSelect = ({
  options,
  value,
  onChange,
  placeholder = "Select options",
  searchPlaceholder = "Search...",
  isDisabled = false,
}: MultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // close on outside click
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

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Control */}
      <div
        onClick={() => !isDisabled && setOpen(!open)}
        className={`min-h-[42px] px-3 py-2 flex flex-wrap gap-2 items-center rounded-lg border cursor-pointer
        ${isDisabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
        border-indigo-500`}
      >
        {value.length === 0 && (
          <span className="text-gray-400">{placeholder}</span>
        )}

        {value.map((item) => (
          <span
            key={item.value}
            className="flex items-center gap-1 px-2 py-1 text-sm rounded-md bg-indigo-500 text-white"
          >
            {item.label}
            {!isDisabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((v) => v.value !== item.value));
                }}
              >
                ✕
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Dropdown */}
      {open && !isDisabled && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-md">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full outline-none text-sm"
            />
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-auto">
            {filteredOptions.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">
                No options found
              </p>
            )}

            {filteredOptions.map((option) => {
              const checked = value.some((v) => v.value === option.value);

              return (
                <label
                  key={option.value}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-indigo-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOption(option)}
                    className="accent-indigo-600"
                  />
                  <span>{option.label}</span>
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
