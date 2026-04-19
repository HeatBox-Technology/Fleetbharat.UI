import { routing } from "./routing";

export function stripLocaleFromPathname(pathname: string): string {
  const safePathname = pathname && pathname.startsWith("/") ? pathname : `/${pathname || ""}`;
  const segments = safePathname.split("/").filter(Boolean);
  const firstSegment = (segments[0] || "").toLowerCase();
  const isLocalePrefixed = routing.locales.includes(firstSegment as (typeof routing.locales)[number]);

  if (!isLocalePrefixed) return safePathname || "/";

  const rest = `/${segments.slice(1).join("/")}`;
  return rest === "/" ? "/" : rest;
}

export function buildLocalePath(nextLocale: string, pathname: string): string {
  const restPath = stripLocaleFromPathname(pathname);
  const normalizedRest = restPath === "/" ? "" : restPath;
  return nextLocale === routing.defaultLocale
    ? normalizedRest || "/"
    : `/${nextLocale}${normalizedRest}`;
}

