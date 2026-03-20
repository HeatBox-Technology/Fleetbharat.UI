"use client";

import { useEffect, useMemo } from "react";
import { useLocale, useMessages } from "next-intl";

type MessageShape = {
  auto?: Record<
    string,
    string | { source?: string; target?: string }
  >;
};

const ATTRIBUTES_TO_TRANSLATE = ["placeholder", "title", "aria-label", "alt"];

const getTrimmedTranslation = (
  value: string,
  dictionary: Record<string, string>,
): string => {
  const raw = String(value || "");
  const trimmed = raw.trim();
  if (!trimmed) return raw;

  const translated = dictionary[trimmed];
  if (!translated) return raw;

  const prefixLength = raw.indexOf(trimmed);
  const suffixLength = raw.length - (prefixLength + trimmed.length);
  const prefix = prefixLength > 0 ? raw.slice(0, prefixLength) : "";
  const suffix = suffixLength > 0 ? raw.slice(raw.length - suffixLength) : "";

  return `${prefix}${translated}${suffix}`;
};

const shouldSkipElement = (element: Element): boolean => {
  const tag = element.tagName.toLowerCase();
  return (
    tag === "script" ||
    tag === "style" ||
    tag === "noscript" ||
    tag === "code" ||
    tag === "pre" ||
    Boolean(element.closest("[data-no-auto-locale='true']"))
  );
};

const translateElementAttributes = (
  element: Element,
  dictionary: Record<string, string>,
) => {
  for (const attr of ATTRIBUTES_TO_TRANSLATE) {
    const currentValue = element.getAttribute(attr);
    if (!currentValue) continue;

    const nextValue = getTrimmedTranslation(currentValue, dictionary);
    if (nextValue !== currentValue) {
      element.setAttribute(attr, nextValue);
    }
  }
};

const translateTextNodes = (root: Node, dictionary: Record<string, string>) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentNode: Node | null = walker.nextNode();

  while (currentNode) {
    const parentElement = currentNode.parentElement;
    if (parentElement && !shouldSkipElement(parentElement)) {
      const currentText = currentNode.nodeValue || "";
      const nextText = getTrimmedTranslation(currentText, dictionary);
      if (nextText !== currentText) {
        currentNode.nodeValue = nextText;
      }
    }
    currentNode = walker.nextNode();
  }
};

const translateNodeTree = (root: Node, dictionary: Record<string, string>) => {
  if (root.nodeType === Node.ELEMENT_NODE) {
    const element = root as Element;
    if (!shouldSkipElement(element)) {
      translateElementAttributes(element, dictionary);
      const allChildren = element.querySelectorAll("*");
      allChildren.forEach((child) => {
        if (!shouldSkipElement(child)) {
          translateElementAttributes(child, dictionary);
        }
      });
    }
  }

  translateTextNodes(root, dictionary);
};

export default function AutoLocaleText() {
  const locale = useLocale();
  const messages = useMessages() as MessageShape;

  const dictionary = useMemo(() => {
    const autoEntries = messages?.auto || {};
    const mapped: Record<string, string> = {};

    Object.entries(autoEntries).forEach(([key, value]) => {
      if (typeof value === "string") {
        // Backward-compatible with old structure: { "source": "target" }
        mapped[key] = value;
        return;
      }

      const source = String(value?.source || "").trim();
      const target = String(value?.target || "").trim();
      if (source && target) {
        mapped[source] = target;
      }
    });

    return mapped;
  }, [messages]);

  useEffect(() => {
    if (!dictionary || Object.keys(dictionary).length === 0) return;

    translateNodeTree(document.body, dictionary);

    let rafId: number | null = null;
    const observer = new MutationObserver((mutations) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              translateNodeTree(node, dictionary);
            });
          }

          if (
            mutation.type === "attributes" &&
            mutation.target instanceof Element
          ) {
            translateElementAttributes(mutation.target, dictionary);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ATTRIBUTES_TO_TRANSLATE,
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [locale, dictionary]);

  return null;
}
