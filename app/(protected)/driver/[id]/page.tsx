"use client";

import { User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { getAllAccounts } from "@/services/commonServie";
import {
  getDriverById,
  saveDriver,
  updateDriver,
} from "@/services/driverService";

interface DropdownOption {
  id: number;
  value: string;
}

const AddEditDriver: React.FC = () => {
  const { selectedColor } = useColor();
  const { isDark } = useTheme();
  const t = useTranslations("pages.driver.detail");
  const tList = useTranslations("pages.driver.list");
  const router = useRouter();
  const params = useParams();

  const driverId = params?.id ? Number(params.id) : 0;
  const isEditMode = driverId > 0;

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");
  const [licenceNo, setLicenceNo] = useState("");
  const [licenceExpiry, setLicenceExpiry] = useState("");
  const [organisationId, setOrganisationId] = useState<number | string>("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [driverCode, setDriverCode] = useState("");
  const [accounts, setAccounts] = useState<DropdownOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: account.value,
  }));

  const countryCodeOptions = [
    { value: "+91", label: "+91 (India)" },
    { value: "+1", label: "+1 (USA/Canada)" },
    { value: "+44", label: "+44 (UK)" },
    { value: "+971", label: "+971 (UAE)" },
    { value: "+61", label: "+61 (Australia)" },
    { value: "+65", label: "+65 (Singapore)" },
  ];

  const bloodGroupOptions = [
    { value: "A+", label: "A+" },
    { value: "A-", label: "A-" },
    { value: "B+", label: "B+" },
    { value: "B-", label: "B-" },
    { value: "O+", label: "O+" },
    { value: "O-", label: "O-" },
    { value: "AB+", label: "AB+" },
    { value: "AB-", label: "AB-" },
  ];

  const splitPhoneNumber = (rawPhone?: string) => {
    const value = (rawPhone || "").trim();
    if (!value) {
      return { countryCode: "+91", phone: "" };
    }

    const matchedCode = countryCodeOptions.find((item) =>
      value.startsWith(item.value),
    );

    if (matchedCode) {
      return {
        countryCode: matchedCode.value,
        phone: value.slice(matchedCode.value.length).replace(/\D/g, ""),
      };
    }

    return {
      countryCode: "+91",
      phone: value.replace(/\D/g, ""),
    };
  };

  const getLocalStorageAccountId = () => {
    if (typeof window === "undefined") return 0;
    try {
      const selectedAccountId = Number(localStorage.getItem("accountId") || 0);
      if (selectedAccountId > 0) return selectedAccountId;
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return Number(user?.accountId || user?.AccountId || 0);
    } catch {
      return 0;
    }
  };

  const toOptions = (response: any): DropdownOption[] => {
    const data = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];

    return data.map((item: any) => ({
      id: Number(item?.id ?? item?.value ?? 0),
      value: String(item?.value ?? item?.name ?? item?.label ?? item?.id ?? ""),
    }));
  };

  const fetchAccounts = async () => {
    try {
      const response = await getAllAccounts();
      setAccounts(toOptions(response));
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  useEffect(() => {
    const accountId = getLocalStorageAccountId();
    if (!isEditMode && accountId) {
      setOrganisationId(accountId);
    }

    fetchAccounts();

    if (isEditMode) {
      fetchDriverData();
    }
  }, [driverId]);

  const fetchDriverData = async () => {
    try {
      setFetchingData(true);
      const response = await getDriverById(driverId);

      if (response.success && response.data) {
        const driver = Array.isArray(response.data)
          ? response.data[0]
          : response.data;
        const normalizedName = driver.name || "";
        const [first = "", ...rest] = normalizedName.split(" ");

        setDriverCode(driver.driverCode || "");
        setFirstName(driver.firstName || first);
        setLastName(driver.lastName || rest.join(" "));
        const parsedPhone = splitPhoneNumber(driver.mobile || "");
        setCountryCode(parsedPhone.countryCode);
        setMobile(parsedPhone.phone);
        setLicenceNo(driver.licenceNo || driver.licenseNumber || "");
        setLicenceExpiry(
          driver.licenceExpiry || driver.licenseExpiry
            ? (driver.licenceExpiry || driver.licenseExpiry).split("T")[0]
            : "",
        );
        setBloodGroup(driver.bloodGroup || "");
        setEmergencyContact(driver.emergencyContact || "");
        setOrganisationId(driver.organisationId || driver.accountId || "");
        const status = String(driver.statusKey || "").toLowerCase();
        setIsActive(driver.isActive ?? status !== "inactive");
      } else {
        toast.error(t("toast.fetchFailed"));
        router.back();
      }
    } catch (error) {
      console.error("Error fetching driver:", error);
      toast.error(t("toast.loadError"));
      router.back();
    } finally {
      setFetchingData(false);
    }
  };

  const handleSubmit = async () => {
    if (!firstName.trim()) {
      toast.error(t("validation.firstNameRequired"));
      return;
    }
    if (!countryCode.trim() || !mobile.trim()) {
      toast.error(t("validation.mobileRequired"));
      return;
    }
    if (!licenceNo.trim()) {
      toast.error(t("validation.licenceNoRequired"));
      return;
    }
    if (!licenceExpiry.trim()) {
      toast.error(t("validation.licenceExpiryRequired"));
      return;
    }
    if (!organisationId) {
      toast.error(t("validation.organisationRequired"));
      return;
    }

    const normalizedMobile = `${countryCode}${mobile.replace(/\D/g, "")}`;
    const accountIdNumber = Number(organisationId);
    const actorAccountId = Number(
      getLocalStorageAccountId() || accountIdNumber,
    );
    const payload = {
      accountId: accountIdNumber,
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      mobile: normalizedMobile,
      licenseNumber: licenceNo.trim(),
      licenseExpiry: licenceExpiry
        ? new Date(`${licenceExpiry}T00:00:00.000Z`).toISOString()
        : null,
      bloodGroup: bloodGroup.trim() || null,
      emergencyContact: emergencyContact.trim() || null,
      statusKey: isActive ? "active" : "inactive",
      isActive,
      ...(isEditMode
        ? { updatedBy: actorAccountId }
        : { createdBy: actorAccountId }),
    };

    try {
      setLoading(true);
      let response;

      if (isEditMode) {
        response = await updateDriver(payload, driverId);
      } else {
        response = await saveDriver(payload);
      }

      if (response.success) {
        toast.success(isEditMode ? t("toast.updated") : t("toast.created"));
        router.push("/driver");
      } else {
        toast.error(`${t("toast.failed")}: ${response.message}`);
      }
    } catch (error) {
      console.error("Error saving driver:", error);
      toast.error(t("toast.saveError"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const inputClass = `w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
    isDark
      ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  }`;

  if (fetchingData) {
    return (
      <div className={`${isDark ? "dark" : ""}`}>
        <ActionLoader isVisible={true} text="Loading driver details..." />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""}`}>
      <ActionLoader
        isVisible={loading}
        text={isEditMode ? "Updating driver..." : "Creating driver..."}
      />
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-2 mt-10`}
      >
        <PageHeader
          title={isEditMode ? t("title.edit") : t("title.create")}
          subtitle={
            isEditMode
              ? t("section.editDescription")
              : t("section.createDescription")
          }
          breadcrumbs={[
            { label: tList("breadcrumbs.fleet") },
            { label: tList("breadcrumbs.current"), href: "/driver" },
            { label: isEditMode ? t("title.edit") : t("title.create") },
          ]}
          showButton={true}
          buttonText={
            loading
              ? isEditMode
                ? t("buttons.updating")
                : t("buttons.creating")
              : isEditMode
                ? t("buttons.update")
                : t("buttons.create")
          }
          onButtonClick={handleSubmit}
          showExportButton={false}
          showFilterButton={false}
          showBulkUpload={false}
        />

        <div className="w-full">
          {/* Form Card */}
          <div
            className="bg-card rounded-2xl shadow-lg border-t-4 border-border overflow-hidden"
            style={{ borderTopColor: selectedColor }}
          >
            <div className="p-8">
              {/* Section Header */}
              <div className="flex items-start gap-3 mb-6">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${selectedColor}20` }}
                >
                  <User className="w-5 h-5" style={{ color: selectedColor }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {t("section.title")}
                  </h2>
                  <p className="text-sm text-foreground opacity-60">
                    {isEditMode
                      ? t("section.editDescription")
                      : t("section.createDescription")}
                  </p>
                </div>
              </div>

              {/* Organisation */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  {t("fields.organisation")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={accountOptions}
                  value={
                    accountOptions.find(
                      (option) => Number(option.value) === Number(organisationId),
                    ) || null
                  }
                  onChange={(option) =>
                    setOrganisationId(option ? Number(option.value) : "")
                  }
                  placeholder={t("fields.selectAccount")}
                  isDisabled={loading}
                  isDark={isDark}
                  noOptionsMessage={t("fields.selectAccount")}
                />
              </div>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.firstName")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t("fields.firstNamePlaceholder")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                    className={inputClass}
                    onFocus={(e) =>
                      (e.target.style.borderColor = selectedColor)
                    }
                    onBlur={(e) => (e.target.style.borderColor = "")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.lastName")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("fields.lastNamePlaceholder")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading}
                    className={inputClass}
                    onFocus={(e) =>
                      (e.target.style.borderColor = selectedColor)
                    }
                    onBlur={(e) => (e.target.style.borderColor = "")}
                  />
                </div>
              </div>

              {/* Mobile & Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.mobile")} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex min-w-0 gap-2">
                    <div className="w-40 shrink-0 sm:w-48">
                      <SearchableDropdown
                        options={countryCodeOptions}
                        value={
                          countryCodeOptions.find(
                            (option) => option.value === countryCode,
                          ) || null
                        }
                        onChange={(option) =>
                          setCountryCode(option?.value as string || "+91")
                        }
                        placeholder={t("fields.countryCode")}
                        isDisabled={loading}
                        isDark={isDark}
                        noOptionsMessage={t("fields.noCountryCode")}
                      />
                    </div>
                    <input
                      type="tel"
                      placeholder={t("fields.mobilePlaceholder")}
                      value={mobile}
                      onChange={(e) =>
                        setMobile(e.target.value.replace(/\D/g, ""))
                      }
                      disabled={loading}
                      className={inputClass}
                      onFocus={(e) =>
                        (e.target.style.borderColor = selectedColor)
                      }
                      onBlur={(e) => (e.target.style.borderColor = "")}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.emergencyContact")}
                  </label>
                  <input
                    type="tel"
                    placeholder={t("fields.emergencyPlaceholder")}
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    disabled={loading}
                    className={inputClass}
                    onFocus={(e) =>
                      (e.target.style.borderColor = selectedColor)
                    }
                    onBlur={(e) => (e.target.style.borderColor = "")}
                  />
                </div>
              </div>

              {/* Licence No, Licence Expiry & Blood Group */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.licenceNo")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t("fields.licenceNoPlaceholder")}
                    value={licenceNo}
                    onChange={(e) => setLicenceNo(e.target.value)}
                    disabled={loading}
                    required
                    className={inputClass}
                    onFocus={(e) =>
                      (e.target.style.borderColor = selectedColor)
                    }
                    onBlur={(e) => (e.target.style.borderColor = "")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.licenceExpiry")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={licenceExpiry}
                    onChange={(e) => setLicenceExpiry(e.target.value)}
                    disabled={loading}
                    min={today}
                    required
                    className={inputClass}
                    onFocus={(e) =>
                      (e.target.style.borderColor = selectedColor)
                    }
                    onBlur={(e) => (e.target.style.borderColor = "")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.bloodGroup")}
                  </label>
                  <SearchableDropdown
                    options={bloodGroupOptions}
                    value={
                      bloodGroupOptions.find(
                        (option) => option.value === bloodGroup,
                      ) || null
                    }
                    onChange={(option) =>
                      setBloodGroup(option?.value as string || "")
                    }
                    placeholder={t("fields.bloodGroupPlaceholder")}
                    isDisabled={loading}
                    isDark={isDark}
                    isClearable={true}
                    noOptionsMessage={t("fields.noBloodGroup")}
                  />
                </div>
              </div>

              {/* Driver Status Toggle */}
              <div className="bg-background rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1">
                      {t("status.title")}
                    </h3>
                    <p className="text-sm text-foreground opacity-60">
                      {t("status.description")}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsActive(!isActive)}
                    disabled={loading}
                    className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
                    style={{
                      backgroundColor: isActive ? selectedColor : "#cbd5e1",
                    }}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        isActive ? "translate-x-8" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                id="form-footer-actions"
                className="form-footer-actions flex justify-end gap-3"
              >
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    isDark
                      ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                  }`}
                >
                  {t("buttons.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEditDriver;
