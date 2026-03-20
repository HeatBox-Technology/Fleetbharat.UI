import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { resolveLocale } from "./getLocale";
import { loadMessages } from "./loadMessages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const finalLocale = await resolveLocale(locale);
  const messages = await loadMessages(finalLocale);

  return {
    locale: finalLocale,
    messages,
  };
});

