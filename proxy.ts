import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const normalizePath = (pathname: string) => {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
};

const getLocaleFromPath = (pathname: string) => {
  const firstSegment = pathname.split("/").filter(Boolean)[0] || "";
  const locale = firstSegment.toLowerCase();
  return routing.locales.includes(locale as (typeof routing.locales)[number])
    ? locale
    : null;
};

const stripLocaleFromPath = (pathname: string, locale: string | null) => {
  if (!locale) return pathname;
  const prefix = `/${locale}`;
  if (pathname === prefix) return "/";
  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length) || "/";
  }
  return pathname;
};

const resolveLocaleFromRequest = (request: NextRequest) => {
  const localeCookie = (request.cookies.get("locale")?.value || "")
    .toLowerCase()
    .split("-")[0];
  if (
    routing.locales.includes(localeCookie as (typeof routing.locales)[number])
  ) {
    return localeCookie;
  }
  return routing.defaultLocale;
};

const getLocalePath = (locale: string, path: string) => {
  const normalizedPath = path === "/" ? "" : path;
  if (locale === routing.defaultLocale) {
    return normalizedPath || "/";
  }
  return `/${locale}${normalizedPath}` || `/${locale}`;
};

export function proxy(request: NextRequest) {
  const pathname = normalizePath(request.nextUrl.pathname);
  const localeInPath = getLocaleFromPath(pathname);
  const strippedPath = normalizePath(
    stripLocaleFromPath(pathname, localeInPath),
  );
  const locale = localeInPath || resolveLocaleFromRequest(request);

  // ✅ VERY IMPORTANT: allow next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/proxy") ||
    pathname.startsWith("/vts-proxy") ||
    pathname.startsWith("/live-tracking-proxy") ||
    pathname.startsWith("/java-proxy") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  // Canonical: default locale should not be prefixed.
  if (localeInPath === routing.defaultLocale) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = strippedPath || "/";
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  // Non-default locale must be prefixed.
  if (!localeInPath && locale !== routing.defaultLocale) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getLocalePath(locale, strippedPath);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  const token = request.cookies.get("authToken")?.value;
  const isPublicPath = strippedPath === "/";

  if (!token && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = getLocalePath(locale, "/");
    loginUrl.search = "";
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  if (token && isPublicPath) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = getLocalePath(locale, "/dashboard");
    dashboardUrl.search = "";
    const response = NextResponse.redirect(dashboardUrl);
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  const response =
    localeInPath && localeInPath !== routing.defaultLocale
      ? NextResponse.rewrite(
          (() => {
            const rewriteUrl = request.nextUrl.clone();
            rewriteUrl.pathname = strippedPath;
            return rewriteUrl;
          })(),
          {
            request: {
              headers: requestHeaders,
            },
          },
        )
      : NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });

  response.cookies.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}
