"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface SessionExpiredModalProps {
  isOpen: boolean;
  onAcknowledge: () => void;
}

export default function SessionExpiredModal({
  isOpen,
  onAcknowledge,
}: SessionExpiredModalProps) {
  const t = useTranslations("auth.sessionExpired");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900">{t("title")}</h2>
        <p className="mt-2 text-sm text-gray-600">{t("message")}</p>
        <button
          type="button"
          onClick={onAcknowledge}
          className="mt-6 w-full rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-red-700"
        >
          {t("action")}
        </button>
      </div>
    </div>
  );
}
