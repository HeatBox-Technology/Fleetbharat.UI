"use client";

import { ShieldCheck, Smartphone, Wifi } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Card } from "@/components/CommonCard";
import PageHeader from "@/components/PageHeader";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import {
  SimAccount,
  SimCarrier,
  SimFormData,
} from "@/interfaces/sim.interface";
import { getAllAccounts } from "@/services/commonServie";
import {
  getSimById,
  saveSim,
  updateSim,
} from "@/services/simservice";

const getErrorMessage = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const maybeAxiosError = error as {
    message?: string;
    response?: {
      data?: {
        message?: string;
      };
    };
  };

  return maybeAxiosError.response?.data?.message || maybeAxiosError.message || null;
};

const ProvisionSim: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const t = useTranslations("pages.simMaster.detail");
  const tList = useTranslations("pages.simMaster.list");
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const isEditMode = id && id !== "0";

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  const [accounts, setAccounts] = useState<SimAccount[]>([]);
  const [carriers, setCarriers] = useState<SimCarrier[]>([
    { id: 1, name: "BSNL" },
    { id: 2, name: "Jio" },
    { id: 3, name: "Airtel" },
    { id: 4, name: "Vi (Vodafone Idea)" },
    { id: 5, name: "MTNL" },
    { id: 6, name: "Tata Docomo" },
    { id: 7, name: "Aircel" },
  ]);

  const [formData, setFormData] = useState<SimFormData>({
    // Hardware Identity
    accountId: 0,
    iccid: "",
    msisdn: "",
    imsi: "", // API field: imsi (not imsiCode)

    // Carrier Details
    networkProviderId: 0, // API field: networkProviderId (not carrierId)
    activatedAt: "", // API field: activatedAt (not activatedOn)
    expiryAt: "", // API field: expiryAt (not contractExpiry)

    // Status
    statusKey: "active", // API field: statusKey → "active" | "inactive"
  });
  const today = new Date().toISOString().split("T")[0];

  const getUserAccountIdFromStorage = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return Number(user?.accountId || 0);
    } catch (error) {
      console.error("Failed to parse user account:", error);
      return 0;
    }
  };

  const normalizeSimStatus = (sim: any): "active" | "inactive" => {
    if (Boolean(sim?.isDeleted)) return "inactive";
    if (typeof sim?.isActive === "boolean") {
      return sim.isActive ? "active" : "inactive";
    }

    const rawStatus = String(
      sim?.statusKey ?? sim?.status ?? sim?.statusLabel ?? "",
    )
      .trim()
      .toLowerCase();

    if (["inactive", "disabled", "expired"].includes(rawStatus)) {
      return "inactive";
    }

    return "active";
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  const inputClass = (extra = "") =>
    `w-full px-3 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
      isDark
        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
    } ${extra}`;

  const labelClass = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`;

  // ── Load reference data ────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setPageLoading(true);
      try {
        const [accRes] = await Promise.all([getAllAccounts()]);
        const userAccountId = getUserAccountIdFromStorage();

        // Accounts response shape: [{ id: 1, value: "IOTEdge (Acc-001)" }, ...]
        if (accRes.statusCode === 200) {
          setAccounts(accRes.data);
        }

        if (!isEditMode && userAccountId > 0) {
          setFormData((prev) => ({
            ...prev,
            accountId: userAccountId,
          }));
        }

        console.log("isEditMode", isEditMode);

        if (isEditMode) {
          const res = await getSimById(id);
          console.log("getSimById response", res);

          if (res && res.statusCode === 200) {
            const d = res.data;

            // Actual API response fields:
            // simId, accountId, iccid, msisdn, imsi,
            // networkProviderId, statusKey ("active"/"inactive"),
            // activatedAt, expiryAt,
            // createdAt, createdBy, updatedAt, updatedBy,
            // isActive, isDeleted

            setFormData({
              accountId: Number(d.accountId ?? userAccountId ?? 0),
              iccid: d.iccid || "",
              msisdn: d.msisdn || "",
              imsi: d.imsi || "", // ✅ imsi not imsiCode
              networkProviderId: d.networkProviderId ?? 0, // ✅ networkProviderId not carrierId
              activatedAt: d.activatedAt // ✅ activatedAt not activatedOn
                ? d.activatedAt.split("T")[0]
                : "",
              expiryAt: d.expiryAt // ✅ expiryAt not contractExpiry
                ? d.expiryAt.split("T")[0]
                : "",
              statusKey: normalizeSimStatus(d),
            });
          } else {
            toast.error(t("toast.notFound"));
            router.push("/sim-master");
          }
        }
      } catch (err: unknown) {
        console.error(err);
        toast.error(t("toast.loadFailed"));
      } finally {
        setPageLoading(false);
      }
    };
    init();
  }, [id, isEditMode, router, t]);

  // ── Form change handler ────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "iccid") {
      const normalizedValue = value.replace(/\D/g, "").slice(0, 20);
      setFormData((prev) => ({ ...prev, iccid: normalizedValue }));
      return;
    }

    if (name === "accountId" || name === "networkProviderId") {
      setFormData((prev) => ({ ...prev, [name]: Number(value) }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formData.accountId || formData.accountId === 0) {
      toast.error(t("toast.selectAccount"));
      return;
    }
    if (!formData.iccid.trim()) {
      toast.error(t("toast.iccidRequired"));
      return;
    }
    if (!/^\d{19,20}$/.test(formData.iccid.trim())) {
      toast.error(t("toast.iccidRange"));
      return;
    }
    if (!formData.networkProviderId || formData.networkProviderId === 0) {
      toast.error(t("toast.selectProvider"));
      return;
    }

    try {
      setLoading(true);

      // Payload uses the same field names as the API
      const payload = {
        ...(isEditMode && { simId: Number(id) }),
        accountId: Number(formData.accountId),
        iccid: formData.iccid.trim(),
        msisdn: formData.msisdn.trim() || "",
        imsi: formData.imsi.trim() || "",
        networkProviderId: Number(formData.networkProviderId),
        activatedAt: formData.activatedAt
          ? new Date(formData.activatedAt).toISOString()
          : null,
        expiryAt: formData.expiryAt
          ? new Date(formData.expiryAt).toISOString()
          : null,
        statusKey: formData.statusKey, // "active" | "inactive"
      };

      const response = isEditMode
        ? await updateSim(id, payload)
        : await saveSim(payload);

      if (
        response?.success === true ||
        [200, 201].includes(Number(response?.statusCode))
      ) {
        toast.success(response.message || t("toast.saved"));
        setTimeout(() => router.push("/sim-master"), 1000);
      } else {
        toast.error(response.message || t("toast.operationFailed"));
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err) || t("toast.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  // ── Section header helper ──────────────────────────────────────────────
  const SectionHeader = ({
    icon: Icon,
    title,
    subtitle,
  }: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
  }) => (
    <div
      className={`flex items-center gap-3 py-3 mb-4 border-b ${
        isDark ? "border-gray-700" : "border-gray-200"
      }`}
    >
      <div
        className="p-2 rounded-lg"
        style={{ backgroundColor: `${selectedColor}20` }}
      >
        <Icon className="w-4 h-4" style={{ color: selectedColor }} />
      </div>
      <div>
        <h3
          className={`text-sm font-bold uppercase tracking-widest ${
            isDark ? "text-foreground" : "text-gray-800"
          }`}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className={`text-xs mt-0.5 ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  if (pageLoading) {
    return (
      <div className={`${isDark ? "dark" : ""}`}>
        <div
          className={`min-h-screen ${
            isDark ? "bg-background" : ""
          } p-6 flex items-center justify-center`}
        >
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
              style={{ borderColor: selectedColor }}
            ></div>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              {isEditMode ? t("loading.edit") : t("loading.create")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div
        className={`min-h-screen ${
          isDark ? "bg-background" : ""
        } p-3 sm:p-4 md:p-6`}
      >
        <div className="mb-6">
          <PageHeader
            title={isEditMode ? t("title.edit") : t("title.create")}
            subtitle={isEditMode ? t("subtitle.edit") : t("subtitle.create")}
            breadcrumbs={[
              { label: tList("breadcrumbs.fleet") },
              { label: tList("breadcrumbs.current"), href: "/sim-master" },
              { label: isEditMode ? t("title.edit") : t("title.create") },
            ]}
            showButton
            buttonText={
              loading
                ? t("buttons.saving")
                : isEditMode
                  ? t("buttons.update")
                  : t("buttons.create")
            }
            onButtonClick={handleSubmit}
          />
        </div>

        {/* Form Card */}
        <Card isDark={isDark}>
          <div className="p-4 sm:p-6 space-y-8">
            {/* ── HARDWARE IDENTITY ── */}
            <div>
              <SectionHeader
                icon={ShieldCheck}
                title={t("sections.hardwareIdentity")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* accountId ← accounts[].id, display accounts[].value */}
                <div>
                  <label className={labelClass}>
                    {t("fields.accountContext")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="accountId"
                    value={formData.accountId}
                    onChange={handleChange}
                    className={inputClass()}
                  >
                    <option value="0">{t("fields.selectAccount")}</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.value} {/* e.g. "IOTEdge (Acc-001)" */}
                      </option>
                    ))}
                  </select>
                </div>

                {/* iccid */}
                <div>
                  <label className={labelClass}>
                    {t("fields.iccid")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="iccid"
                    value={formData.iccid}
                    onChange={handleChange}
                    placeholder={t("fields.iccidPlaceholder")}
                    inputMode="numeric"
                    maxLength={20}
                    className={inputClass()}
                  />
                  {formData.iccid &&
                    !/^\d{19,20}$/.test(formData.iccid) && (
                      <p className="text-xs text-amber-500 mt-1">
                        {t("validation.iccidRange", {
                          count: formData.iccid.length,
                        })}
                      </p>
                    )}
                </div>

                {/* msisdn */}
                <div>
                  <label className={labelClass}>{t("fields.msisdn")}</label>
                  <input
                    type="text"
                    name="msisdn"
                    value={formData.msisdn}
                    onChange={handleChange}
                    placeholder={t("fields.msisdnPlaceholder")}
                    className={inputClass()}
                  />
                </div>

                {/* imsi — API uses "imsi", not "imsiCode" */}
                <div>
                  <label className={labelClass}>{t("fields.imsi")}</label>
                  <input
                    type="text"
                    name="imsi"
                    value={formData.imsi}
                    onChange={handleChange}
                    placeholder={t("fields.imsiPlaceholder")}
                    maxLength={15}
                    className={inputClass()}
                  />
                  {formData.imsi &&
                    formData.imsi.length > 0 &&
                    formData.imsi.length !== 15 && (
                      <p className="text-xs text-amber-500 mt-1">
                        {t("validation.imsiLength", {
                          count: formData.imsi.length,
                        })}
                      </p>
                    )}
                </div>
              </div>
            </div>

            {/* ── CARRIER DETAILS ── */}
            <div>
              <SectionHeader
                icon={Wifi}
                title={t("sections.carrierDetails")}
                subtitle={t("sections.carrierDetailsSubtitle")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* networkProviderId — API field name */}
                <div>
                  <label className={labelClass}>
                    {t("fields.networkProvider")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="networkProviderId"
                    value={formData.networkProviderId}
                    onChange={handleChange}
                    className={inputClass()}
                  >
                    <option value="0">{t("fields.selectCarrier")}</option>
                    {carriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* spacer column */}
                <div />

                {/* activatedAt — API field name */}
                <div>
                  <label className={labelClass}>
                    {t("fields.activatedOn")}
                  </label>
                  <input
                    type="date"
                    name="activatedAt"
                    value={formData.activatedAt}
                    onChange={handleChange}
                    className={inputClass()}
                  />
                </div>

                {/* expiryAt — API field name */}
                <div>
                  <label className={labelClass}>
                    {t("fields.contractExpiry")}
                  </label>
                  <input
                    type="date"
                    name="expiryAt"
                    value={formData.expiryAt}
                    onChange={handleChange}
                    min={today}
                    className={inputClass()}
                  />
                </div>
              </div>
            </div>

            {/* ── PROVISIONING STATUS ── */}
            <div>
              <SectionHeader
                icon={Smartphone}
                title={t("sections.provisioningStatus")}
              />
              <div
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  isDark
                    ? "border-gray-700 bg-gray-800/50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      isDark ? "text-foreground" : "text-gray-800"
                    }`}
                  >
                    {t("status.title")}
                  </p>
                  <p
                    className={`text-xs mt-0.5 uppercase tracking-wider font-medium ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {t("status.subtitle")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{
                      // statusKey: "active" → green, "inactive" → red
                      color:
                        formData.statusKey === "active" ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {formData.statusKey === "active"
                      ? t("status.enabled")
                      : t("status.disabled")}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.statusKey === "active"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          statusKey: e.target.checked ? "active" : "inactive",
                        }))
                      }
                    />
                    <div
                      className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        backgroundColor:
                          formData.statusKey === "active"
                            ? selectedColor
                            : isDark
                              ? "#374151"
                              : "#D1D5DB",
                      }}
                    ></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => router.push("/sim-master")}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
              >
                {t("buttons.discard")}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProvisionSim;
