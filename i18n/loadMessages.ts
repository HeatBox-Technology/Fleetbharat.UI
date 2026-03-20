"use server";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cookies, headers } from "next/headers";

type GenericObject = Record<string, unknown>;

const isObject = (value: unknown): value is GenericObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const deepMerge = (
  target: GenericObject,
  source: GenericObject,
): GenericObject => {
  const result: GenericObject = { ...target };

  Object.keys(source).forEach((key) => {
    const targetValue = result[key];
    const sourceValue = source[key];

    if (isObject(targetValue) && isObject(sourceValue)) {
      result[key] = deepMerge(targetValue, sourceValue);
      return;
    }

    result[key] = sourceValue;
  });

  return result;
};

const loadJsonFromDirectory = async (
  locale: string,
  directoryName: string,
): Promise<GenericObject> => {
  const baseDir = path.join(process.cwd(), "messages", locale, directoryName);

  const walk = async (dir: string): Promise<string[]> => {
    const entries = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(fullPath);
        if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
          return [fullPath];
        }
        return [];
      }),
    );
    return nested.flat();
  };

  try {
    const files = await walk(baseDir);
    const sorted = files.sort((a, b) => a.localeCompare(b));
    const loaded = await Promise.all(
      sorted.map(async (filePath) => {
        try {
          const content = await readFile(filePath, "utf8");
          return JSON.parse(content) as GenericObject;
        } catch {
          return {};
        }
      }),
    );

    return loaded.reduce<GenericObject>(
      (acc, next) => deepMerge(acc, next),
      {},
    );
  } catch {
    return {};
  }
};

export async function loadMessages(locale: string): Promise<GenericObject> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const base = (await import(`../messages/${locale}/translation.json`)).default;
  let auto: GenericObject = {};
  const pageModules = await loadJsonFromDirectory(locale, "pages");

  try {
    auto = (await import(`../messages/${locale}/translation.auto.json`))
      .default as GenericObject;
  } catch {
    auto = {};
  }

  const cookieOverridesRaw = cookieStore.get("locale-overrides")?.value || "";
  const cookieOverrides = cookieOverridesRaw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const headerOverridesRaw = headerStore.get("x-local-overrides") || "";
  const headerOverrides = headerOverridesRaw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const overrideKeys = Array.from(
    new Set([...cookieOverrides, ...headerOverrides]),
  );
  const overrideFiles = await Promise.all(
    overrideKeys.map(async (key) => {
      try {
        return (await import(`../messages/${locale}/translation.${key}.json`))
          .default as GenericObject;
      } catch {
        return {};
      }
    }),
  );

  const baseWithModules = deepMerge(base as GenericObject, pageModules);
  const baseWithAuto = deepMerge(baseWithModules, auto);

  return overrideFiles.reduce(
    (acc, next) => deepMerge(acc, next),
    baseWithAuto,
  );
}
