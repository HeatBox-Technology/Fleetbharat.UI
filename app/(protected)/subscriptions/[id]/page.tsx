"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import { getAccountHierarchy } from "@/services/accountService";
import { getPlans } from "@/services/planService";
import { mapPlanToSubscription } from "@/services/subscriptionService";

const formatDateTimeLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const h = `${date.getHours()}`.padStart(2, "0");
  const min = `${date.getMinutes()}`.padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
};

const AddSubscriptionPage = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.subscriptions.detail");
  const params = useParams();
  const id = String(params?.id || "0");
  const isAddMode = id === "0";

  const [loading, setLoading] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [accountOptions, setAccountOptions] = useState<
    Array<{ id: number; value: string }>
  >([]);
  const [planOptions, setPlanOptions] = useState<
    Array<{ id: number; name: string }>
  >([]);

  const [formData, setFormData] = useState({
    accountId: 0,
    planId: 0,
    units: "1",
    startDate: formatDateTimeLocal(new Date()),
    endDate: formatDateTimeLocal(
      new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    ),
    status: "Active",
  });

  const getActorId = () => {
    if (typeof window === "undefined") return 1;
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const numericAccountId = Number(user?.accountId || 1);
      return Number.isFinite(numericAccountId) ? numericAccountId : 1;
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
      const [accountsRes, plansRes] = await Promise.all([
        getAccountHierarchy(),
        getPlans(1, 500, ""),
      ]);

      const accounts = Array.isArray(accountsRes?.data) ? accountsRes.data : [];
      const plansRaw = Array.isArray(plansRes?.data?.items)
        ? plansRes.data.items
        : [];
      const plans = plansRaw.map((p: any) => ({
        id: Number(p?.id || 0),
        name: String(p?.planName || `Plan ${p?.id || ""}`),
      }));

      setAccountOptions(accounts);
      setPlanOptions(plans);

      setFormData((prev) => ({
        ...prev,
        accountId: prev.accountId || Number(accounts?.[0]?.id || actorId),
        planId: prev.planId || Number(plans?.[0]?.id || 0),
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

    if (!formData.accountId || !formData.planId) {
      toast.error(t("toast.selectAccountPlan"));
      return;
    }

    if (Number(formData.units || 0) <= 0) {
      toast.error(t("toast.unitsGreaterThanZero"));
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error(t("toast.validDates"));
      return;
    }
    if (end <= start) {
      toast.error(t("toast.endAfterStart"));
      return;
    }

    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const payload = {
        accountId: Number(formData.accountId),
        planId: Number(formData.planId),
        units: Number(formData.units || 0),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        status: formData.status || "Active",
        createdBy: actorId,
        updatedBy: actorId,
        createdDate: nowIso,
        updatedDate: nowIso,
      };

      const response = await mapPlanToSubscription(payload);
      if (response?.success || response?.statusCode === 200) {
        toast.success(response?.message || t("toast.mappedSuccess"));
        router.push("/subscriptions");
      } else {
        toast.error(response?.message || t("toast.mapFailed"));
      }
    } catch (error) {
      toast.error(t("toast.mapFailed"));
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
              { label: t("breadcrumbs.current"), href: "/subscriptions" },
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
              <select
                name="accountId"
                value={formData.accountId}
                onChange={handleInputChange}
                disabled={loadingDropdowns}
                className={`w-full px-4 py-3 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                {accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={`block text-xs font-bold mb-2 uppercase tracking-wide ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {t("fields.plan")}
              </label>
              <select
                name="planId"
                value={formData.planId}
                onChange={handleInputChange}
                disabled={loadingDropdowns}
                className={`w-full px-4 py-3 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                {planOptions.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={`block text-xs font-bold mb-2 uppercase tracking-wide ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {t("fields.units")}
              </label>
              <input
                type="number"
                min={1}
                name="units"
                value={formData.units}
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
                {t("fields.status")}
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-lg border ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div>
              <label
                className={`block text-xs font-bold mb-2 uppercase tracking-wide ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {t("fields.startDate")}
              </label>
              <input
                type="datetime-local"
                name="startDate"
                value={formData.startDate}
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
                {t("fields.endDate")}
              </label>
              <input
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
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
              onClick={() => router.push("/subscriptions")}
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

export default AddSubscriptionPage;
