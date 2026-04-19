import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "hi", "te", "ta", "kn", "es", "fr"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

