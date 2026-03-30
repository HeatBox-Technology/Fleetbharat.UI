import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "hi", "te", "ta", "kn"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

