import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
const javaApiBaseUrl = process.env.NEXT_PUBLIC_JAVA_API_BASE_URL?.replace(
  /\/+$/,
  "",
);
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: appRoot,
  },
  async rewrites() {
    const rules = [];

    if (apiBaseUrl) {
      rules.push({
        source: "/proxy/:path*",
        destination: `${apiBaseUrl}/:path*`,
      });
    }

    if (apiBaseUrl) {
      rules.push({
        source: "/vts-proxy/:path*",
        destination: `${apiBaseUrl}/:path*`,
      });
    }

    if (apiBaseUrl) {
      rules.push({
        source: "/live-tracking-proxy/:path*",
        destination: `${apiBaseUrl}/:path*`,
      });
    }

    if (javaApiBaseUrl) {
      rules.push({
        source: "/java-proxy/:path*",
        destination: `${javaApiBaseUrl}/:path*`,
      });
    }

    return rules;
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
