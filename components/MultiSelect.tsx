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
        className={`min-h-[52px] rounded-2xl border px-3 py-2 ${
          isDisabled
            ? "cursor-not-allowed bg-gray-100"
            : "cursor-pointer bg-white"
        } flex items-center border-slate-200 shadow-sm transition focus-within:border-violet-400`}
      >
        <div className="flex max-h-[72px] min-h-[28px] w-full flex-wrap items-center gap-2 overflow-y-auto pr-1">
          {value.length === 0 && (
            <span className="self-center text-gray-400">{placeholder}</span>
          )}

          {value.map((item) => (
            <span
              key={item.value}
              className="flex max-w-full items-center gap-1 rounded-md bg-indigo-500 px-2 py-1 text-sm text-white"
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
      </div>

      {open && !isDisabled && (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-sm outline-none"
            />
          </div>

          <div className="max-h-64 overflow-auto">
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
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-indigo-50"
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
