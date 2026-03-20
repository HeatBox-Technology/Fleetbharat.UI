import { cookies, headers } from "next/headers";
import { routing } from "./routing";

const normalizeLocale = (value: string): string =>
  String(value || "").toLowerCase().split("-")[0];

const isSupportedLocale = (value: string): value is (typeof routing.locales)[number] =>
  routing.locales.includes(value as (typeof routing.locales)[number]);

const resolveFromAcceptLanguage = (headerValue: string | null): string | null => {
  if (!headerValue) return null;

  const candidates = headerValue
    .split(",")
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean)
    .map((part) => normalizeLocale(part));

  for (const candidate of candidates) {
    if (isSupportedLocale(candidate)) {
      return candidate;
    }
  }

  return null;
};

export async function resolveLocale(requestLocaleFromUrl?: string): Promise<string> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const fromHeader = normalizeLocale(headerStore.get("x-locale") || "");
  if (isSupportedLocale(fromHeader)) {
    return fromHeader;
  }

  const localeCookie = normalizeLocale(cookieStore.get("locale")?.value || "");
  if (isSupportedLocale(localeCookie)) {
    return localeCookie;
  }

  const localeFromUrl = normalizeLocale(requestLocaleFromUrl || "");
  if (isSupportedLocale(localeFromUrl)) {
    return localeFromUrl;
  }

  const localeFromHeader = resolveFromAcceptLanguage(
    headerStore.get("accept-language"),
  );
  if (localeFromHeader && isSupportedLocale(localeFromHeader)) {
    return localeFromHeader;
  }

  return routing.defaultLocale;
}
