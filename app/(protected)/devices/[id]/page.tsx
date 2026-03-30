"use client";

import { Card } from "@/components/CommonCard";
import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { SimAccount } from "@/interfaces/sim.interface";
import {
  getAllAccounts,
  getDeviceTypeDropdown,
  getOemManufacturersDropdown,
} from "@/services/commonServie";
import {
  getDeviceById,
  saveDevice,
  updateDevice,
} from "@/services/deviceService";
import { Building2, Layers, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface DeviceFormData {
  accountId: number;
  manufacturerId: number;
  deviceTypeId: number;
  deviceNo: string;
  deviceImeiOrSerial: string;
  createdBy: number;
  updatedBy: number;
  deviceStatus: string;
  isActive: boolean;
}

interface SelectOption {
  id: number;
  value: string;
}

interface DeviceTypeOption {
  id: number;
  displayName: string;
}

const ProvisionDevice: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const t = useTranslations("pages.devices.detail");
  const tList = useTranslations("pages.devices.list");
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const isEditMode = Boolean(id && id !== "0");

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [accounts, setAccounts] = useState<SimAccount[]>([]);
  const [manufacturers, setManufacturers] = useState<SelectOption[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceTypeOption[]>([]);
  const [formData, setFormData] = useState<DeviceFormData>({
    accountId: 0,
    manufacturerId: 0,
    deviceTypeId: 0,
    deviceNo: "",
    deviceImeiOrSerial: "",
    createdBy: 0,
    updatedBy: 0,
    deviceStatus: "ACTIVE",
    isActive: true,
  });
  const accountOptions = accounts.map((account) => ({
    value: Number(account.id),
    label: account.value,
  }));
  const manufacturerOptions = manufacturers.map((manufacturer) => ({
    value: Number(manufacturer.id),
    label: manufacturer.value,
  }));
  const deviceTypeOptions = deviceTypes.map((type) => ({
    value: Number(type.id),
    label: type.displayName,
  }));

  const inputClass = (extra = "") =>
    `w-full px-3 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
      isDark
        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
    } ${extra}`;

  const labelClass = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`;

  const getStorageUser = () => {
    if (typeof window === "undefined") return { accountId: 0, userId: 0 };

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userAccountId = Number(user?.accountId || 0);
      return {
        accountId: userAccountId || 0,
        userId: Number(user?.userId || 0),
      };
    } catch (error) {
      console.error("Failed to parse user from localStorage:", error);
      return { accountId: 0, userId: 0 };
    }
  };

  useEffect(() => {
    const init = async () => {
      setPageLoading(true);
      try {
        const { accountId, userId } = getStorageUser();
        const [accRes, deviceTypeRes, manufacturerRes] = await Promise.all([
          getAllAccounts(),
          getDeviceTypeDropdown(),
          getOemManufacturersDropdown(),
        ]);

        if (accRes?.statusCode === 200 && Array.isArray(accRes?.data)) {
          setAccounts(accRes.data);
        }

        if (
          deviceTypeRes?.statusCode === 200 &&
          Array.isArray(deviceTypeRes?.data)
        ) {
          setDeviceTypes(
            deviceTypeRes.data.map((item: any) => ({
              id: Number(item?.id || 0),
              displayName: item?.displayName || item?.value || "",
            })),
          );
        }

        if (
          manufacturerRes?.statusCode === 200 &&
          Array.isArray(manufacturerRes?.data)
        ) {
          setManufacturers(manufacturerRes.data);
        }

        if (!isEditMode) {
          setFormData((prev) => ({
            ...prev,
            accountId: prev.accountId || accountId,
            createdBy: prev.createdBy || userId,
            updatedBy: prev.updatedBy || userId,
          }));
        }

        if (isEditMode) {
          const response = await getDeviceById(id);
          if (response?.statusCode === 200 && response?.data) {
            const device = response.data;
            setFormData({
              accountId: Number(accountId || device?.accountId || 0),
              manufacturerId: Number(device?.manufacturerId || 0),
              deviceTypeId: Number(device?.deviceTypeId || 0),
              deviceNo: device?.deviceNo || "",
              deviceImeiOrSerial: device?.deviceImeiOrSerial || "",
              createdBy: Number(device?.createdBy || userId || 0),
              updatedBy: Number(device?.updatedBy || userId || 0),
              deviceStatus: device?.deviceStatus || "ACTIVE",
              isActive:
                typeof device?.isActive === "boolean" ? device.isActive : true,
            });
          }
        }
      } catch (error) {
        console.error(error);
        toast.error(t("toast.loadFailed"));
      } finally {
        setPageLoading(false);
      }
    };

    init();
  }, [id, isEditMode, t]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const numberFields = ["accountId", "manufacturerId", "deviceTypeId"];

    if (name === "deviceImeiOrSerial") {
      const normalizedValue = value.replace(/\D/g, "");
      setFormData((prev) => ({
        ...prev,
        deviceImeiOrSerial: normalizedValue,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: numberFields.includes(name) ? Number(value) : value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.accountId) {
      toast.error(t("toast.selectAccount"));
      return;
    }
    if (!formData.manufacturerId) {
      toast.error(t("toast.selectManufacturer"));
      return;
    }
    if (!formData.deviceTypeId) {
      toast.error(t("toast.selectDeviceType"));
      return;
    }
    if (!formData.deviceImeiOrSerial.trim()) {
      toast.error(t("toast.serialRequired"));
      return;
    }
    if (!/^\d+$/.test(formData.deviceImeiOrSerial.trim())) {
      toast.error(t("toast.serialNumericOnly"));
      return;
    }

    try {
      setLoading(true);
      const { accountId, userId } = getStorageUser();
      const payload = {
        ...(isEditMode && { id: Number(id) }),
        manufacturerId: Number(formData.manufacturerId),
        deviceTypeId: Number(formData.deviceTypeId),
        deviceNo: formData.deviceNo.trim(),
        deviceImeiOrSerial: formData.deviceImeiOrSerial.trim(),
        ...(isEditMode
          ? {
              deviceStatus: formData.deviceStatus || "ACTIVE",
              isActive: formData.isActive,
              updatedBy: Number(accountId || userId || formData.updatedBy || 0),
            }
          : {
              accountId: Number(formData.accountId),
              createdBy: Number(
                formData.accountId ||
                  accountId ||
                  userId ||
                  formData.createdBy ||
                  0,
              ),
            }),
      };

      const response = isEditMode
        ? await updateDevice(id, payload)
        : await saveDevice(payload);

      if (response?.statusCode === 200) {
        toast.success(response?.message || t("toast.saved"));
        setTimeout(() => router.push("/devices"), 800);
      } else {
        toast.error(response?.message || t("toast.operationFailed"));
      }
    } catch (error) {
      console.error(error);
      toast.error(t("toast.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

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
          text={isEditMode ? "Loading device..." : "Preparing device form..."}
        />
        <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-6`} />
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader
        isVisible={loading}
        text={isEditMode ? "Updating device..." : "Saving device..."}
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
              { label: tList("breadcrumbs.current"), href: "/devices" },
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

        <Card isDark={isDark}>
          <div className="p-4 sm:p-6 space-y-8">
            <div>
              <SectionHeader
                icon={Building2}
                title={t("sections.accountContext")}
                subtitle={t("sections.accountContextSubtitle")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
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
                    isDisabled={isEditMode}
                    isDark={isDark}
                    noOptionsMessage={t("fields.selectAccount")}
                  />
                </div>
              </div>
            </div>

            <div>
              <SectionHeader
                icon={Layers}
                title={t("sections.identityLifecycle")}
                subtitle={t("sections.identityLifecycleSubtitle")}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    {t("fields.manufacturer")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <SearchableDropdown
                    options={manufacturerOptions}
                    value={
                      manufacturerOptions.find(
                        (option) =>
                          Number(option.value) === formData.manufacturerId,
                      ) || null
                    }
                    onChange={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        manufacturerId: Number(option?.value || 0),
                      }))
                    }
                    placeholder={t("fields.selectManufacturer")}
                    isDark={isDark}
                    noOptionsMessage={t("fields.selectManufacturer")}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {t("fields.deviceType")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <SearchableDropdown
                    options={deviceTypeOptions}
                    value={
                      deviceTypeOptions.find(
                        (option) => Number(option.value) === formData.deviceTypeId,
                      ) || null
                    }
                    onChange={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        deviceTypeId: Number(option?.value || 0),
                      }))
                    }
                    placeholder={t("fields.selectDeviceType")}
                    isDark={isDark}
                    noOptionsMessage={t("fields.selectDeviceType")}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t("fields.deviceNo")}</label>
                  <input
                    type="text"
                    name="deviceNo"
                    value={formData.deviceNo}
                    onChange={handleChange}
                    placeholder={t("fields.deviceNoPlaceholder")}
                    className={inputClass()}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {t("fields.serial")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="deviceImeiOrSerial"
                    value={formData.deviceImeiOrSerial}
                    onChange={handleChange}
                    placeholder={t("fields.serialPlaceholder")}
                    inputMode="numeric"
                    className={inputClass()}
                    style={{ letterSpacing: "0.05em" }}
                  />
                </div>
              </div>
            </div>

            {formData.deviceImeiOrSerial && (
              <div>
                <SectionHeader
                  icon={Smartphone}
                  title={t("sections.preview")}
                  subtitle={t("sections.previewSubtitle")}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: t("preview.deviceType"),
                      value:
                        deviceTypes.find(
                          (item) => item.id === Number(formData.deviceTypeId),
                        )?.displayName || t("preview.empty"),
                    },
                    {
                      label: t("preview.manufacturer"),
                      value:
                        manufacturers.find(
                          (item) => item.id === Number(formData.manufacturerId),
                        )?.value || t("preview.empty"),
                    },
                    {
                      label: t("preview.deviceNo"),
                      value: formData.deviceNo || t("preview.empty"),
                    },
                    {
                      label: t("preview.serial"),
                      value: formData.deviceImeiOrSerial,
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className={`p-3 rounded-xl border ${
                        isDark
                          ? "border-gray-700 bg-gray-800/50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <p
                        className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${
                          isDark ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        {label}
                      </p>
                      <p
                        className={`text-sm font-semibold truncate ${
                          isDark ? "text-foreground" : "text-gray-800"
                        }`}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => router.push("/devices")}
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

export default ProvisionDevice;
