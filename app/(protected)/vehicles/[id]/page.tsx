"use client";

import { Layers, Shield, Truck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import { Card } from "@/components/CommonCard";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import {
  Account,
  VehicleBrand,
  VehicleFormData,
  VehicleType,
} from "@/interfaces/vehicle.interface";
import { getAllAccounts } from "@/services/commonServie";
import {
  getVehicleById,
  getVehicleType,
  saveVehicle,
  updateVehicle,
} from "@/services/vehicleService";

const ProvisionVehicle: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const t = useTranslations("pages.vehicles.detail");
  const tList = useTranslations("pages.vehicles.list");
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const isEditMode = id && id !== "0";

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [storedAccountId, setStoredAccountId] = useState<number>(0);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);
  const [leasedVendors, setLeasedVendors] = useState<
    { id: number; name: string }[]
  >([]);
  const [formData, setFormData] = useState<VehicleFormData>({
    // Identification
    accountId: 0,
    registrationNumber: "",
    vinNumber: "",
    registrationDate: new Date().toISOString().split("T")[0],

    // Classification
    vehicleTypeId: 0,
    vehicleBrandId: 0,
    vehicleClass: "",
    vehicleColor: "",

    // Ownership
    ownershipBasis: "OWNED",
    leasedVendorId: 0,
    lessorName: "",

    // Compliance
    rtoPassing: "",
    warranty: "",
    insurer: "",
    imageFilePath: "",

    // Status
    status: true,
  });

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
  const normalizeRegistrationNumber = (value: string) => value.slice(0, 20);

  const normalizeVin = (value: string) => value.slice(0, 17);

  // ── Load reference data ────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setPageLoading(true);
      try {
        const user =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("user") || "{}")
            : {};
        const accountIdFromStorage = Number(user?.accountId || 0);
        setStoredAccountId(accountIdFromStorage);

        const [
          accRes,
          typeRes,
          // brandRes, leasedVendorRes
        ] = await Promise.all([
          getAllAccounts(),
          getVehicleType(),
        ]);

        if (accRes.statusCode === 200) setAccounts(accRes.data);
        if (typeRes) setVehicleTypes(typeRes);
        // if (brandRes) setVehicleBrands(brandRes);
        // if (leasedVendorRes) {
        //   setLeasedVendors(leasedVendorRes);
        // }

        if (isEditMode) {
          const res = await getVehicleById(id);
          console.log("resresres", res);
          if (res && res.statusCode === 200) {
            const d = res.data;
            setFormData({
              // Identification
              accountId: d.accountId,
              registrationNumber: d.vehicleNumber,
              vinNumber: d.vinOrChassisNumber || "",
              registrationDate: d.registrationDate
                ? d.registrationDate.split("T")[0]
                : new Date().toISOString().split("T")[0],

              // Classification
              vehicleTypeId: d.vehicleTypeId,
              vehicleBrandId: d.vehicleBrandOemId,
              vehicleClass: d.vehicleClass || "",
              vehicleColor: d.vehicleColor || "",

              // Ownership
              ownershipBasis:
                d.ownershipType?.toLowerCase() === "leased"
                  ? "LEASED"
                  : "OWNED",
              leasedVendorId: d.leasedVendorId || 0,
              lessorName: d.lessorName || "",

              // Compliance
              rtoPassing: d.rtoPassing || "",
              warranty: d.warranty || "",
              insurer: d.insurer || "",
              imageFilePath: d.imageFilePath || "",

              // Status
              status: d.status?.toLowerCase() === "active",
            });
          } else {
            toast.error(t("toast.notFound"));
            router.push("/vehicles");
          }
        } else if (accRes.statusCode === 200) {
          const accountList = Array.isArray(accRes.data) ? accRes.data : [];
          const hasStoredAccount = accountList.some(
            (account: Account) => Number(account.id) === accountIdFromStorage,
          );

          setFormData((prev) => ({
            ...prev,
            accountId: hasStoredAccount
              ? accountIdFromStorage
              : Number(accountList[0]?.id || 0),
          }));
        }
      } catch (err) {
        console.error(err);
        toast.error(t("toast.loadFailed"));
      } finally {
        setPageLoading(false);
      }
    };
    init();
  }, [id, isEditMode, router, t]);

  // ── Form change handler ────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numberFields = [
      "accountId",
      "vehicleTypeId",
      "vehicleBrandId",
      "leasedVendorId",
    ];

    if (name === "registrationNumber") {
      setFormData((prev) => ({
        ...prev,
        registrationNumber: normalizeRegistrationNumber(value),
      }));
      return;
    }

    if (name === "vinNumber") {
      setFormData((prev) => ({
        ...prev,
        vinNumber: normalizeVin(value),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: numberFields.includes(name) ? Number(value) : value,
    }));
  };

  const accountOptions = accounts.map((account) => ({
    value: Number(account.id),
    label: account.value,
  }));

  const vehicleTypeOptions = vehicleTypes.map((vehicleType) => ({
    value: Number(vehicleType.id),
    label: vehicleType.vehicleTypeName,
  }));

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formData.accountId || formData.accountId === 0) {
      toast.error(t("toast.selectAccount"));
      return;
    }
    if (!formData.registrationNumber.trim()) {
      toast.error(t("toast.registrationRequired"));
      return;
    }
  if (
  formData.vinNumber.trim() &&
  formData.vinNumber.trim().length !== 17
) {
  toast.error(t("toast.invalidVin"));
  return;
}
    if (!formData.vehicleTypeId || formData.vehicleTypeId === 0) {
      toast.error(t("toast.selectVehicleType"));
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...(isEditMode && { id: Number(id) }),
        accountId: Number(formData.accountId),
        vehicleNumber: normalizeRegistrationNumber(formData.registrationNumber.trim()),
        vinOrChassisNumber: normalizeVin(formData.vinNumber.trim()) || "",
        vehicleTypeId: Number(formData.vehicleTypeId),
        status: formData.status ? "Active" : "Inactive",
        ...(isEditMode
          ? { updatedBy: Number(storedAccountId || formData.accountId || 0) }
          : { createdBy: Number(storedAccountId || formData.accountId || 0) }),
        // registrationDate: formData.registrationDate
        //   ? new Date(formData.registrationDate).toISOString()
        //   : new Date().toISOString(),
        // vehicleBrandOemId: Number(formData.vehicleBrandId) || 0,
        // ownershipType:
        //   formData.ownershipBasis.charAt(0).toUpperCase() +
        //   formData.ownershipBasis.slice(1).toLowerCase(),
        // leasedVendorId:
        //   formData.ownershipBasis === "LEASED"
        //     ? Number(formData.leasedVendorId) || 0
        //     : null,
        // imageFilePath: formData.imageFilePath || "",
        // status: formData.status ? "Active" : "Inactive",
        // vehicleClass: formData.vehicleClass || "",
        // rtoPassing: formData.rtoPassing || "",
        // warranty: formData.warranty || "",
        // insurer: formData.insurer || "",
        // vehicleColor: formData.vehicleColor || "",
      };

      const response = isEditMode
        ? await updateVehicle(id, payload)
        : await saveVehicle(payload);

      if (response.statusCode === 200) {
        toast.success(response.message || t("toast.saved"));
        setTimeout(() => router.push("/vehicles"), 1000);
      } else {
        toast.error(response.message || t("toast.operationFailed"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("toast.errorOccurred"));
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
      className={`flex items-center gap-3 py-3 mb-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
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
            className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
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
        <ActionLoader
          isVisible={true}
          text={isEditMode ? "Loading vehicle details..." : "Preparing vehicle form..."}
        />
        <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-6`} />
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader
        isVisible={loading}
        text={isEditMode ? "Updating vehicle..." : "Saving vehicle..."}
      />
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-3 sm:p-4 md:p-6`}
      >
        <div className="mb-6">
          <PageHeader
            title={isEditMode ? t("title.edit") : t("title.create")}
            subtitle={isEditMode ? t("subtitle.edit") : t("subtitle.create")}
            breadcrumbs={[
              { label: tList("breadcrumbs.fleet") },
              { label: tList("breadcrumbs.current"), href: "/vehicles" },
              { label: isEditMode ? t("title.edit") : t("title.create") },
            ]}
            showButton={true}
            buttonText={
              loading
                ? t("buttons.saving")
                : isEditMode
                  ? t("buttons.update")
                  : t("buttons.create")
            }
            onButtonClick={handleSubmit}
            showExportButton={false}
            showFilterButton={false}
            showBulkUpload={false}
          />
        </div>

        {/* Form Card */}
        <Card isDark={isDark}>
          <div className="p-4 sm:p-6 space-y-8">
            {/* ── VEHICLE IDENTIFICATION ── */}
            <div>
              <SectionHeader
                icon={Shield}
                title={t("sections.identification")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    {t("fields.account")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <SearchableDropdown
                    options={accountOptions}
                    value={
                      accountOptions.find(
                        (option) => Number(option.value) === formData.accountId,
                      ) || null
                    }
                    onChange={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        accountId: Number(option?.value || 0),
                      }))
                    }
                    placeholder={t("fields.selectAccount")}
                    isDark={isDark}
                    noOptionsMessage={t("fields.selectAccount")}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {t("fields.registration")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    placeholder={t("fields.registrationPlaceholder")}
                    className={inputClass()}
                    maxLength={20}
                    style={{ letterSpacing: "0.05em" }}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("fields.vin")}</label>
                  <input
                    type="text"
                    name="vinNumber"
                    value={formData.vinNumber}
                    onChange={handleChange}
                    placeholder={t("fields.vinPlaceholder")}
                    maxLength={17}
                    className={inputClass()}
                  />
                  {formData.vinNumber &&
  formData.vinNumber.length !== 17 && (
    <p className="text-xs text-amber-500 mt-1">
      {t("fields.vinHint")} ({formData.vinNumber.length}/17)
    </p>
  )}
                </div>

                {/* <div>
                  <label className={labelClass}>Registration Date</label>
                  <input
                    type="date"
                    name="registrationDate"
                    value={formData.registrationDate}
                    onChange={handleChange}
                    className={inputClass()}
                  />
                </div> */}
              </div>
            </div>

            {/* ── CLASSIFICATION ── */}
            <div>
              <SectionHeader
                icon={Layers}
                title={t("sections.classification")}
                subtitle={t("sections.classificationSubtitle")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    {t("fields.vehicleType")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <SearchableDropdown
                    options={vehicleTypeOptions}
                    value={
                      vehicleTypeOptions.find(
                        (option) =>
                          Number(option.value) === formData.vehicleTypeId,
                      ) || null
                    }
                    onChange={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        vehicleTypeId: Number(option?.value || 0),
                      }))
                    }
                    placeholder={t("fields.selectType")}
                    isDark={isDark}
                    noOptionsMessage={t("fields.selectType")}
                  />
                </div>

                {/* <div>
                  <label className={labelClass}>Vehicle Class</label>
                  <input
                    type="text"
                    name="vehicleClass"
                    value={formData.vehicleClass}
                    onChange={handleChange}
                    placeholder="e.g. Hatchback, SUV, HCV"
                    className={inputClass()}
                  />
                </div> */}

                {/* <div>
                  <label className={labelClass}>Vehicle Color</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="vehicleColor"
                      value={formData.vehicleColor}
                      onChange={handleChange}
                      placeholder="e.g. White, Red, Orange"
                      className={inputClass()}
                    />
                    {formData.vehicleColor && (
                      <div
                        className="w-10 h-10 rounded-lg border flex-shrink-0"
                        style={{
                          backgroundColor: formData.vehicleColor.toLowerCase(),
                          borderColor: isDark ? "#374151" : "#D1D5DB",
                        }}
                        title={formData.vehicleColor}
                      />
                    )}
                  </div>
                </div> */}
              </div>
            </div>

            {/* ── OWNERSHIP (commented out) ── */}
            {/* <div>
              <SectionHeader icon={Building2} title="Ownership" />
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>
                    Ownership Basis <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {(["OWNED", "LEASED"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            ownershipBasis: opt,
                            lessorName: opt === "OWNED" ? "" : prev.lessorName,
                            leasedVendorId:
                              opt === "OWNED" ? 0 : prev.leasedVendorId,
                          }))
                        }
                        className={`px-6 py-2 rounded-lg text-sm font-semibold tracking-wide border transition-all ${
                          formData.ownershipBasis === opt
                            ? "text-white border-transparent"
                            : isDark
                              ? "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
                              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                        }`}
                        style={
                          formData.ownershipBasis === opt
                            ? { backgroundColor: selectedColor }
                            : {}
                        }
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.ownershipBasis === "LEASED" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Lessor / Leasing Entity</label>
                      <select
                        name="leasedVendorId"
                        value={formData.leasedVendorId || 0}
                        onChange={handleChange}
                        className={inputClass()}
                      >
                        <option value={0}>Select Vendor</option>
                        {leasedVendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div> */}

            {/* ── COMPLIANCE & DOCUMENTATION (commented out) ── */}
            {/* <div>
              <SectionHeader
                icon={FileText}
                title="Compliance & Documentation"
                subtitle="Regulatory and insurance details."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>RTO Passing</label>
                  <input
                    type="text"
                    name="rtoPassing"
                    value={formData.rtoPassing}
                    onChange={handleChange}
                    placeholder="e.g. RTO444"
                    className={inputClass()}
                  />
                </div>

                <div>
                  <label className={labelClass}>Insurer</label>
                  <input
                    type="text"
                    name="insurer"
                    value={formData.insurer}
                    onChange={handleChange}
                    placeholder="e.g. Kotak, HDFC ERGO"
                    className={inputClass()}
                  />
                </div>

                <div>
                  <label className={labelClass}>Warranty</label>
                  <input
                    type="text"
                    name="warranty"
                    value={formData.warranty}
                    onChange={handleChange}
                    placeholder="e.g. 2 years / 1,00,000 km"
                    className={inputClass()}
                  />
                </div>
              </div>
            </div> */}

            {/* ── OPERATIONAL STATUS ── */}
            <div>
              <SectionHeader
                icon={Truck}
                title={t("sections.operationalStatus")}
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
                    style={{ color: formData.status ? "#16a34a" : "#dc2626" }}
                  >
                    {formData.status
                      ? t("status.active")
                      : t("status.inactive")}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.checked,
                        }))
                      }
                    />
                    <div
                      className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        backgroundColor: formData.status
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

            <div
              id="form-footer-actions"
              className="form-footer-actions flex justify-end"
            >
              <button
                onClick={() => router.push("/vehicles")}
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

export default ProvisionVehicle;
