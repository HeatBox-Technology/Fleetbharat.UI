import { routing } from "@/i18n/routing";

type AccountLanguageConfiguration = {
  defaultLanguage?: string | null;
  allowedLanguages?: string[] | null;
};

type LanguageOption = {
  value: string;
  label: string;
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  hi: "Hindi",
  kn: "Kannada",
  ta: "Tamil",
  te: "Telugu",
};

const normalizeLocaleCode = (value?: string | null): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split("-")[0];

export const getAccountLanguageOptions = (
  configuration?: AccountLanguageConfiguration | null,
): LanguageOption[] => {
  const defaultLanguage = normalizeLocaleCode(configuration?.defaultLanguage);
  const allowedLanguages = Array.isArray(configuration?.allowedLanguages)
    ? configuration.allowedLanguages.map((item) => normalizeLocaleCode(item))
    : [];

  const mergedCodes = [defaultLanguage, ...allowedLanguages].filter(Boolean);
  const uniqueCodes = [...new Set(mergedCodes)];

  const supportedOptions = uniqueCodes
    .filter((code) =>
      routing.locales.includes(code as (typeof routing.locales)[number]),
    )
    .map((code) => ({
      value: code,
      label: LANGUAGE_LABELS[code] || code.toUpperCase(),
    }));

  if (supportedOptions.length > 0) {
    return supportedOptions;
  }

  return [
    {
      value: routing.defaultLocale,
      label:
        LANGUAGE_LABELS[routing.defaultLocale] ||
        routing.defaultLocale.toUpperCase(),
    },
  ];
};
