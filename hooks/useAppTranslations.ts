"use client";

import { useTranslations } from "next-intl";

export const useAppTranslations = (namespace?: string) =>
  useTranslations(namespace);

