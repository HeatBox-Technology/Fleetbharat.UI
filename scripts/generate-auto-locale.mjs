import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SOURCE_DIRS = ["app", "components", "context", "hooks", "providers"];
const TARGET_EXTENSIONS = new Set([".tsx", ".jsx", ".ts", ".js"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "messages", "i18n"]);

const normalize = (value) =>
  value
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();

const shouldKeep = (value) => {
  if (!value) return false;
  if (value.length < 2) return false;
  if (!/[A-Za-z\u0900-\u097F]/.test(value)) return false;
  if (/^(https?:\/\/|\/|@\/|\.\/|\.\.\/)/.test(value)) return false;
  if (/^[\w-]+(\s+[\w-]+)?$/.test(value) && value.toLowerCase() === value) {
    // simple code-ish tokens like "flex", "text-sm"
    if (!value.includes(" ")) return false;
  }
  if (value.startsWith("bg-") || value.startsWith("text-")) return false;
  return true;
};

const walkFiles = (dirPath, bucket) => {
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkFiles(fullPath, bucket);
      continue;
    }

    const ext = path.extname(entry.name);
    if (!TARGET_EXTENSIONS.has(ext)) continue;
    bucket.push(fullPath);
  }
};

const extractFromSource = (source) => {
  const items = new Set();

  // JSX text nodes: >Text<
  const jsxTextRegex = />([^<>{}\n][^<>{}]*)</g;
  let jsxMatch;
  while ((jsxMatch = jsxTextRegex.exec(source)) !== null) {
    const value = normalize(jsxMatch[1]);
    if (shouldKeep(value)) items.add(value);
  }

  // Quoted literals often used in placeholders, labels, toast messages, etc.
  const quotedRegex = /(["'`])((?:\\.|(?!\1).)*)\1/g;
  let quotedMatch;
  while ((quotedMatch = quotedRegex.exec(source)) !== null) {
    const value = normalize(quotedMatch[2]);
    if (shouldKeep(value)) items.add(value);
  }

  return items;
};

const collectAllTexts = () => {
  const files = [];
  SOURCE_DIRS.forEach((dir) => walkFiles(path.join(ROOT, dir), files));

  const all = new Set();
  files.forEach((filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    const extracted = extractFromSource(content);
    extracted.forEach((item) => all.add(item));
  });

  return Array.from(all).sort((a, b) => a.localeCompare(b));
};

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const readJson = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
};

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
};

const buildSourceToTargetMap = (existingAuto = {}) => {
  const sourceToTarget = new Map();

  Object.entries(existingAuto).forEach(([key, value]) => {
    if (typeof value === "string") {
      // Backward-compatible with previous invalid format: { "Source Text": "Target Text" }
      sourceToTarget.set(key, value);
      return;
    }

    if (
      value &&
      typeof value === "object" &&
      typeof value.source === "string" &&
      typeof value.target === "string"
    ) {
      sourceToTarget.set(value.source, value.target);
    }
  });

  return sourceToTarget;
};

const buildAutoMap = (texts, existingAuto = {}, fallbackToSource = true) => {
  const output = {};
  const sourceToTarget = buildSourceToTargetMap(existingAuto);

  texts.forEach((text, index) => {
    const key = `entry_${String(index + 1).padStart(6, "0")}`;
    output[key] = {
      source: text,
      target: sourceToTarget.get(text) ?? (fallbackToSource ? text : ""),
    };
  });

  return output;
};

const run = () => {
  const texts = collectAllTexts();

  const enPath = path.join(ROOT, "messages", "en", "translation.auto.json");
  const hiPath = path.join(ROOT, "messages", "hi", "translation.auto.json");

  ensureDir(path.dirname(enPath));
  ensureDir(path.dirname(hiPath));

  const existingEn = readJson(enPath);
  const existingHi = readJson(hiPath);

  const enAuto = buildAutoMap(texts, existingEn?.auto || {}, true);
  const hiAuto = buildAutoMap(texts, existingHi?.auto || {}, true);

  writeJson(enPath, { auto: enAuto });
  writeJson(hiPath, { auto: hiAuto });

  console.log(
    `Generated translation.auto.json with ${texts.length} static text entries.`,
  );
};

run();
