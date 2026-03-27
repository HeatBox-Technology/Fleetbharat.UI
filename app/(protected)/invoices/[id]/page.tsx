"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useTheme } from "@/context/ThemeContext";
import { getAccountHierarchy } from "@/services/accountService";
import { getSubscriptions } from "@/services/subscriptionService";
import { createManualInvoice } from "@/services/invoiceService";
import { getCurrencies } from "@/services/commonServie";

const formatDateTimeLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const h = `${date.getHours()}`.padStart(2, "0");
  const min = `${date.getMinutes()}`.padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
};

const AddInvoicePage = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.invoices.detail");
  const params = useParams();
  const id = String(params?.id || "0");
  const isAddMode = id === "0";

  const [loading, setLoading] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  const [accountOptions, setAccountOptions] = useState<
    Array<{ id: number; value: string }>
  >([]);
  const [subscriptionOptions, setSubscriptionOptions] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [currencyOptions, setCurrencyOptions] = useState<
    Array<{ id: number; value: string }>
  >([]);

  const [formData, setFormData] = useState({
    accountId: 0,
    subscriptionId: 0,
    amount: "",
    currency: "",
    invoiceDate: formatDateTimeLocal(new Date()),
    dueDate: formatDateTimeLocal(
      new Date(new Date().setDate(new Date().getDate() + 30)),
    ),
  });
  const searchableAccountOptions = accountOptions.map((account) => ({
    value: account.id,
    label: account.value,
  }));
  const searchableSubscriptionOptions = subscriptionOptions.map((subscription) => ({
    value: subscription.id,
    label: subscription.name,
  }));
  const searchableCurrencyOptions = currencyOptions.map((currency) => ({
    value: currency.value,
    label: currency.value,
  }));

  const getActorId = () => {
    if (typeof window === "undefined") return 1;
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return Number(user?.accountId || 1);
    } catch {
      return 1;
    }
  };

  const actorId = useMemo(() => getActorId(), []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchDropdowns = async () => {
    setLoadingDropdowns(true);
    try {
      const [accountsRes, subscriptionsRes, currenciesRes] = await Promise.all([
        getAccountHierarchy(),
        getSubscriptions(1, 500, ""),
        getCurrencies(),
      ]);

      const accounts = Array.isArray(accountsRes?.data) ? accountsRes.data : [];
      const subscriptionsRaw = Array.isArray(subscriptionsRes?.data?.items)
        ? subscriptionsRes.data.items
        : [];
      const subscriptions = subscriptionsRaw.map((s: any) => ({
        id: Number(s?.id || s?.subscriptionId || 0),
        name: String(
          s?.planName && s?.accountName
            ? `${s.planName} - ${s.accountName}`
            : s?.planName || s?.subscriptionName || `Subscription ${s?.id || ""}`,
        ),
      }));

      const currencies = Array.isArray(currenciesRes?.data)
        ? currenciesRes.data
        : [];

      setAccountOptions(accounts);
      setSubscriptionOptions(subscriptions);
      setCurrencyOptions(currencies);

      setFormData((prev) => ({
        ...prev,
        accountId: prev.accountId || Number(accounts?.[0]?.id || actorId),
        subscriptionId: prev.subscriptionId || Number(subscriptions?.[0]?.id || 0),
        currency: prev.currency || String(currencies?.[0]?.value || ""),
      }));
    } catch (error) {
      toast.error(t("toast.dropdownFailed"));
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const handleSubmit = async () => {
    if (!isAddMode) {
      toast.info(t("toast.editNotEnabled"));
      return;
    }

    if (!formData.accountId || !formData.subscriptionId) {
      toast.error(t("toast.selectAccountSubscription"));
      return;
    }

    if (!formData.currency) {
      toast.error(t("toast.selectCurrency"));
      return;
    }

    const amountNum = Number(formData.amount || 0);
    if (amountNum <= 0) {
      toast.error(t("toast.amountGreaterThanZero"));
      return;
    }

    const invoiceDate = new Date(formData.invoiceDate);
    const dueDate = new Date(formData.dueDate);
    if (Number.isNaN(invoiceDate.getTime()) || Number.isNaN(dueDate.getTime())) {
      toast.error(t("toast.validDates"));
      return;
    }

    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const payload = {
        accountId: Number(formData.accountId),
        subscriptionId: Number(formData.subscriptionId),
        amount: amountNum,
        currency: formData.currency,
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate.toISOString(),
        createdBy: actorId,
        updatedBy: actorId,
        createdDate: nowIso,
        updatedDate: nowIso,
      };

      const response = await createManualInvoice(payload);
      if (response?.success || response?.statusCode === 200) {
        toast.success(response?.message || t("toast.createdSuccess"));
        router.push("/invoices");
      } else {
        toast.error(response?.message || t("toast.createFailed"));
      }
    } catch (error) {
      toast.error(t("toast.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  return (
    <div className={`${isDark ? "dark" : ""}`}>
      <div
        className={`min-h-screen ${isDark ? "bg-background" : "bg-gray-50"} p-6`}
      >
        <div className="max-w-7xl mx-auto mb-6">
          <PageHeader
            title={isAddMode ? t("title.add") : t("title.edit")}
            subtitle={t("subtitle")}
            breadcrumbs={[
              { label: t("breadcrumbs.billing") },
              { label: t("breadcrumbs.current"), href: "/invoices" },
              { label: isAddMode ? t("title.add") : t("title.edit") },
            ]}
            showButton
            buttonText={loading ? t("buttons.saving") : t("buttons.submit")}
            onButtonClick={() => {
              if (!loading && !loadingDropdowns) {
                handleSubmit();
              }
            }}
          />
        </div>

        <div
          className={`rounded-xl border p-4 sm:p-6 max-w-7xl mx-auto ${
            isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label
                className={`block text-xs font-bold mb-2 uppercase tracking-wide ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {t("fields.account")}
              </label>
              <SearchableDropdown
                options={searchableAccountOptions}
                value={
                  searchableAccountOptions.find(
                    (option) => Number(option.value) === Number(formData.accountId),
                  ) || null
                }
                onChange={(option) =>
                  setFormData((prev) => ({
                    ...prev,
                    accountId: Number(option?.value || 0),
                  }))
                }
                isDisabled={loadingDropdowns}
                placeholder={t("fields.account")}
                isDark={isDark}
                noOptionsMessage={t("fields.account")}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-bold mb-2 uppercase tracking-wide ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {t("fields.subscription")}
              </label>
              <SearchableDropdown
                options={searchableSubscriptionOptions}
                value={
                  searchableSubscriptionOptions.find(
                    (option) => Number(option.value) === Number(formData.subscriptionId),
                  ) || null
                }
                onChange={(option) =>
                  setFormData((prev) => ({
                    ...prev,
                    subscriptionId: Number(option?.value || 0),
                  }))
                }
                isDisabled={loadingDropdowns}
                placeholder={t("fields.subscription")}
                isDark={isDark}
                noOptionsMessage={t("fields.subscription")}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-bold mb-2 uppercase tracking-wide ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {t("fields.amount")}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-bold mb-2 uppercase tracking-wide ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {t("fields.currency")}
              </label>
              <SearchableDropdown
                options={searchableCurrencyOptions}
                value={
                  searchableCurrencyOptions.find(
                    (option) => String(option.value) === String(formData.currency),
                  ) || null
                }
                onChange={(option) =>
                  setFormData((prev) => ({
                    ...prev,
                    currency: String(option?.value || ""),
                  }))
                }
                isDisabled={loadingDropdowns}
                placeholder={t("fields.currency")}
                isDark={isDark}
                noOptionsMessage={t("fields.currency")}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-bold mb-2 uppercase tracking-wide ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {t("fields.invoiceDate")}
              </label>
              <input
                type="datetime-local"
                name="invoiceDate"
                value={formData.invoiceDate}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-xs font-bold mb-2 uppercase tracking-wide ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {t("fields.dueDate")}
              </label>
              <input
                type="datetime-local"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={() => router.push("/invoices")}
              className={`px-5 py-2.5 rounded-lg border ${
                isDark
                  ? "border-gray-700 text-gray-200"
                  : "border-gray-300 text-gray-700"
              }`}
            >
              {t("buttons.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddInvoicePage;
