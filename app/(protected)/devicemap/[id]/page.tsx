"use client";

import React, { useState, useEffect } from "react";
import { Cpu, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter, useParams } from "next/navigation";
import {
  getDeviceMapById,
  saveDeviceMap,
  updateDeviceMap,
} from "@/services/devicemapService";
import {
  JAVA_SYNC_STATUS,
  setDeviceMapSyncStatus,
} from "@/services/deviceMapJavaSyncService";
import {
  getDeviceDropdown,
  getAllAccounts,
  getDeviceTypeDropdown,
  getFormRightForPath,
  getHardwareDropdown,
  getSimDropdownByAccount,
  getVehicleDropdown,
} from "@/services/commonServie";
import { toast } from "react-toastify";

interface DropdownOption {
  id: number;
  value: string;
}

interface DeviceMapFormData {
  id: number;
  accountId: number;
  fk_VehicleId: number;
  fk_devicetypeid: number;
  fk_DeviceId: number;
  fk_simid: number;
  simnno: string;
  remarks: string;
  isActive: number;
  isDeleted: number;
  installationDate: string;
  createdBy: number;
  createdAt: string;
  updatedBy: number;
  updatedAt: string;
}

interface CreateDeviceMapPayload {
  accountId: number;
  vehicleId: number;
  deviceId: number;
  deviceTypeId: number;
  simId: number;
  simNumber: string;
  remarks: string;
  createdBy: number;
}

interface UpdateDeviceMapPayload {
  vehicleId: number;
  deviceId: number;
  deviceTypeId: number;
  simId: number;
  simNumber: string;
  remarks: string;
  isActive: boolean;
  updatedBy: number;
}

const extractSavedMappingId = (response: any, fallbackId = 0): number => {
  const candidates = [
    response?.data?.id,
    response?.data?.vehicleDeviceMapId,
    response?.data?.mapId,
    response?.id,
    response?.vehicleDeviceMapId,
    response?.mapId,
    fallbackId,
  ];

  const parsed = Number(
    candidates.find((value) => value !== undefined && value !== null) || 0,
  );
  return Number.isNaN(parsed) ? 0 : parsed;
};

const AddEditDeviceMap: React.FC = () => {
  const { selectedColor } = useColor();
  const { isDark } = useTheme();
  const router = useRouter();
  const params = useParams();
  const t = useTranslations("pages.devicemap.detail");
  const tList = useTranslations("pages.devicemap.list");

  const deviceMapId = params?.id ? Number(params.id) : 0;
  const isEditMode = deviceMapId > 0;
  const pageRight = getFormRightForPath("/devicemap");
  const canRead = pageRight ? Boolean(pageRight.canRead) : true;
  const canSubmit = pageRight
    ? isEditMode
      ? Boolean(pageRight.canUpdate)
      : Boolean(pageRight.canWrite)
    : true;

  const [accounts, setAccounts] = useState<DropdownOption[]>([]);
  const [vehicles, setVehicles] = useState<DropdownOption[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DropdownOption[]>([]);
  const [hardware, setHardware] = useState<DropdownOption[]>([]);
  const [sims, setSims] = useState<DropdownOption[]>([]);

  const [formData, setFormData] = useState<DeviceMapFormData>({
    id: 0,
    accountId: 0,
    fk_VehicleId: 0,
    fk_devicetypeid: 0,
    fk_DeviceId: 0,
    fk_simid: 0,
    simnno: "",
    remarks: "",
    isActive: 1,
    isDeleted: 0,
    installationDate: new Date().toISOString(),
    createdBy: 0,
    createdAt: new Date().toISOString(),
    updatedBy: 0,
    updatedAt: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const accountOptions = accounts.map((option) => ({
    value: option.id,
    label: option.value,
  }));
  const vehicleOptions = vehicles.map((option) => ({
    value: option.id,
    label: option.value,
  }));
  const deviceTypeOptions = deviceTypes.map((option) => ({
    value: option.id,
    label: option.value,
  }));
  const hardwareOptions = hardware.map((option) => ({
    value: option.id,
    label: option.value,
  }));
  const simOptions = sims.map((option) => ({
    value: option.id,
    label: option.value,
  }));

  const toOptions = (response: any): DropdownOption[] => {
    const data = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];

    return data.map((item: any) => ({
      id: Number(
        item?.id ??
          item?.value ??
          item?.deviceTypeId ??
          item?.accountId ??
          item?.vehicleId ??
          item?.deviceId ??
          item?.simId ??
          0,
      ),
      value: String(
        item?.value ??
          item?.name ??
          item?.label ??
          item?.deviceType ??
          item?.deviceTypeName ??
          item?.accountName ??
          item?.vehicleNo ??
          item?.registrationNo ??
          item?.deviceNo ??
          item?.imei ??
          item?.simNumber ??
          item?.id ??
          "",
      ),
    }));
  };

  const getOptionValueById = (
    options: DropdownOption[],
    id: number,
    fallback = "",
  ): string =>
    options.find((option) => option.id === Number(id))?.value || fallback;

  const getUserData = () => {
    if (typeof window === "undefined") {
      return { accountId: 0, userId: 0 };
    }

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return {
        accountId: Number(user?.accountId || 0),
        userId: Number(user?.id || user?.userId || 0),
      };
    } catch {
      return { accountId: 0, userId: 0 };
    }
  };

  const fetchDropdowns = async (accountId: number) => {
    try {
      const [accountsRes, vehiclesRes, typeRes, simRes, hwRes] =
        await Promise.allSettled([
          getAllAccounts(),
          getVehicleDropdown(accountId),
          getDeviceTypeDropdown(),
          getSimDropdownByAccount(accountId),
          getDeviceDropdown(accountId),
        ]);

      if (accountsRes.status === "fulfilled") {
        setAccounts(toOptions(accountsRes.value));
      }
      if (vehiclesRes.status === "fulfilled") {
        setVehicles(toOptions(vehiclesRes.value));
      }
      if (typeRes.status === "fulfilled") {
        setDeviceTypes(toOptions(typeRes.value));
      }
      if (simRes.status === "fulfilled") {
        setSims(toOptions(simRes.value));
      }
      if (hwRes.status === "fulfilled") {
        setHardware(toOptions(hwRes.value));
      }
    } catch (error) {
      console.error("Error fetching dropdowns:", error);
      toast.error(t("toast.dropdownFailed"));
    }
  };

  const fetchById = async () => {
    try {
      setFetchingData(true);
      const response = await getDeviceMapById(deviceMapId);
      const data = response?.data || response;

      if (!data) {
        toast.error(t("toast.notFound"));
        router.push("/devicemap");
        return;
      }

      setFormData({
        id: Number(data.id || 0),
        accountId: Number(data.accountId || 0),
        fk_VehicleId: Number(data.fk_VehicleId ?? data.vehicleId ?? 0),
        fk_devicetypeid: Number(data.fk_devicetypeid ?? data.deviceTypeId ?? 0),
        fk_DeviceId: Number(data.fk_DeviceId ?? data.deviceId ?? 0),
        fk_simid: Number(data.fk_simid ?? data.simId ?? 0),
        simnno: String(data.simnno ?? data.simNumber ?? ""),
        remarks: String(data.remarks || ""),
        isActive:
          typeof data.isActive === "boolean"
            ? Number(data.isActive)
            : Number(data.isActive ?? 1),
        isDeleted:
          typeof data.isDeleted === "boolean"
            ? Number(data.isDeleted)
            : Number(data.isDeleted ?? 0),
        installationDate: String(
          data.installationDate || new Date().toISOString(),
        ),
        createdBy: Number(data.createdBy || 0),
        createdAt: String(data.createdAt || new Date().toISOString()),
        updatedBy: Number(data.updatedBy || 0),
        updatedAt: String(data.updatedAt || new Date().toISOString()),
      });

      await fetchDropdowns(Number(data.accountId || 0));
    } catch (error) {
      console.error("Error fetching device map by id:", error);
      toast.error(t("toast.fetchFailed"));
      router.push("/devicemap");
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    const { accountId, userId } = getUserData();
    setFormData((prev) => ({
      ...prev,
      accountId: prev.accountId || accountId,
      createdBy: prev.createdBy || userId,
      updatedBy: userId,
    }));

    if (!isEditMode) {
      fetchDropdowns(accountId);
    }
  }, []);

  useEffect(() => {
    if (isEditMode) {
      fetchById();
    }
  }, [deviceMapId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    const numberFields = [
      "accountId",
      "fk_VehicleId",
      "fk_devicetypeid",
      "fk_DeviceId",
      "fk_simid",
      "isActive",
      "isDeleted",
    ];

    setFormData((prev) => {
      if (name === "fk_simid") {
        const simId = Number(value);
        const selectedSim =
          sims.find((option) => option.id === simId)?.value || "";

        return {
          ...prev,
          fk_simid: simId,
          // SIM number is derived from selected SIM to avoid asking twice.
          simnno: selectedSim,
        };
      }

      return {
        ...prev,
        [name]: numberFields.includes(name) ? Number(value) : value,
      };
    });
  };

  useEffect(() => {
    if (!formData.accountId) {
      setVehicles([]);
      setHardware([]);
      setSims([]);
      return;
    }

    Promise.allSettled([
      getVehicleDropdown(formData.accountId),
      getDeviceDropdown(formData.accountId),
      getSimDropdownByAccount(formData.accountId),
    ]).then(([vehiclesRes, devicesRes, simsRes]) => {
      if (vehiclesRes.status === "fulfilled") {
        setVehicles(toOptions(vehiclesRes.value));
      }
      if (devicesRes.status === "fulfilled") {
        setHardware(toOptions(devicesRes.value));
      }
      if (simsRes.status === "fulfilled") {
        setSims(toOptions(simsRes.value));
      }
    });
  }, [formData.accountId]);

  useEffect(() => {
    if (!formData.fk_simid) {
      return;
    }

    const selectedSim =
      sims.find((option) => option.id === Number(formData.fk_simid))?.value ||
      "";

    if (selectedSim && selectedSim !== formData.simnno) {
      setFormData((prev) => ({
        ...prev,
        simnno: selectedSim,
      }));
    }
  }, [sims, formData.fk_simid, formData.simnno]);

  useEffect(() => {
    if (!formData.accountId) return;

    const loadHardware = async () => {
      try {
        if (formData.fk_devicetypeid) {
          const response = await getHardwareDropdown(
            formData.fk_devicetypeid,
            formData.accountId,
          );
          setHardware(toOptions(response));
          return;
        }

        const response = await getDeviceDropdown(formData.accountId);
        setHardware(toOptions(response));
      } catch (error) {
        console.error("Error fetching hardware by device type:", error);
      }
    };

    void loadHardware();
  }, [formData.accountId, formData.fk_devicetypeid]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error(
        isEditMode
          ? t("toast.noUpdatePermission")
          : t("toast.noAddPermission"),
      );
      return;
    }

    if (!formData.accountId) return toast.error(t("toast.selectAccount"));
    if (!formData.fk_VehicleId) return toast.error(t("toast.selectVehicle"));
    if (!formData.fk_devicetypeid)
      return toast.error(t("toast.selectDeviceType"));
    if (!formData.fk_DeviceId) return toast.error(t("toast.selectHardware"));

    const { userId } = getUserData();
    const createPayload: CreateDeviceMapPayload = {
      accountId: Number(formData.accountId),
      vehicleId: Number(formData.fk_VehicleId),
      deviceId: Number(formData.fk_DeviceId),
      deviceTypeId: Number(formData.fk_devicetypeid),
      simId: Number(formData.fk_simid),
      simNumber: String(formData.simnno || ""),
      remarks: String(formData.remarks || ""),
      createdBy: Number(userId || 0),
    };

    const updatePayload: UpdateDeviceMapPayload = {
      vehicleId: Number(formData.fk_VehicleId),
      deviceId: Number(formData.fk_DeviceId),
      deviceTypeId: Number(formData.fk_devicetypeid),
      simId: Number(formData.fk_simid),
      simNumber: String(formData.simnno || ""),
      remarks: String(formData.remarks || ""),
      isActive: Boolean(formData.isActive),
      updatedBy: Number(userId || 0),
    };

    try {
      setLoading(true);
      let response;

      if (isEditMode) {
        response = await updateDeviceMap(deviceMapId, updatePayload);
      } else {
        response = await saveDeviceMap(createPayload);
      }

      if (response?.success || response?.statusCode === 200) {
        const savedMappingId = extractSavedMappingId(response, deviceMapId);
        if (savedMappingId) {
          setDeviceMapSyncStatus(savedMappingId, {
            status: JAVA_SYNC_STATUS.UNSYNCED,
            message: "Pending Java sync",
          });
        }

        toast.success(
          response?.message ||
            (isEditMode ? t("toast.updated") : t("toast.created")),
        );
        router.push("/devicemap");
      } else {
        toast.error(response?.message || t("toast.saveFailed"));
      }
    } catch (error) {
      console.error("Error saving device map:", error);
      toast.error(t("toast.saveError"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (fetchingData) {
    return (
      <div className={`${isDark ? "dark" : ""} `}>
        <ActionLoader isVisible={true} text="Loading assignment details..." />
        <div className="min-h-screen bg-background" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className={`${isDark ? "dark" : ""} `}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-foreground">
            {t("noReadPermission")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader
        isVisible={loading}
        text={isEditMode ? "Updating assignment..." : "Creating assignment..."}
      />
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-3 sm:p-4 md:p-6`}
      >
          <PageHeader
            title={isEditMode ? t("editTitle") : t("createTitle")}
            subtitle={
              isEditMode
                ? t("section.editDescription")
                : t("section.createDescription")
            }
            breadcrumbs={[
              { label: tList("breadcrumbs.fleet") },
              { label: tList("breadcrumbs.current"), href: "/devicemap" },
              { label: isEditMode ? t("editTitle") : t("createTitle") },
            ]}
            showButton
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

          {/* Form Card */}
          <div
            className={`rounded-2xl shadow-lg border-t-4 overflow-hidden ${
              isDark ? "bg-card border border-gray-800" : "bg-white border border-gray-200"
            }`}
            style={{ borderTopColor: selectedColor }}
          >
            <div className={`p-4 sm:p-6 md:p-8 ${isDark ? "bg-card" : "bg-white"}`}>
              {/* Section Header */}
              <div className="flex items-start gap-3 mb-6">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${selectedColor}20` }}
                >
                  <Link2 className="w-5 h-5" style={{ color: selectedColor }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {t("section.parameters")}
                  </h2>
                  <p className="text-sm text-foreground opacity-60">
                    {isEditMode
                      ? t("section.editDescription")
                      : t("section.createDescription")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.account")} <span className="text-red-500">*</span>
                  </label>
                  <SearchableDropdown
                    options={accountOptions}
                    value={
                      accountOptions.find(
                        (option) => Number(option.value) === Number(formData.accountId),
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
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.vehicle")} <span className="text-red-500">*</span>
                  </label>
                  <SearchableDropdown
                    options={vehicleOptions}
                    value={
                      vehicleOptions.find(
                        (option) => Number(option.value) === Number(formData.fk_VehicleId),
                      ) || null
                    }
                    onChange={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        fk_VehicleId: Number(option?.value || 0),
                      }))
                    }
                    placeholder={t("fields.selectVehicle")}
                    isDark={isDark}
                    noOptionsMessage={t("fields.selectVehicle")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.deviceType")} <span className="text-red-500">*</span>
                  </label>
                  <SearchableDropdown
                    options={deviceTypeOptions}
                    value={
                      deviceTypeOptions.find(
                        (option) => Number(option.value) === Number(formData.fk_devicetypeid),
                      ) || null
                    }
                    onChange={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        fk_devicetypeid: Number(option?.value || 0),
                      }))
                    }
                    placeholder={t("fields.selectDeviceType")}
                    isDark={isDark}
                    noOptionsMessage={t("fields.selectDeviceType")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.hardware")} <span className="text-red-500">*</span>
                  </label>
                  <SearchableDropdown
                    options={hardwareOptions}
                    value={
                      hardwareOptions.find(
                        (option) => Number(option.value) === Number(formData.fk_DeviceId),
                      ) || null
                    }
                    onChange={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        fk_DeviceId: Number(option?.value || 0),
                      }))
                    }
                    placeholder={t("fields.selectHardware")}
                    isDark={isDark}
                    noOptionsMessage={t("fields.selectHardware")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.sim")} <span className="text-red-500">*</span>
                  </label>
                  <SearchableDropdown
                    options={simOptions}
                    value={
                      simOptions.find(
                        (option) => Number(option.value) === Number(formData.fk_simid),
                      ) || null
                    }
                    onChange={(option) => {
                      const simId = Number(option?.value || 0);
                      const selectedSim =
                        simOptions.find((item) => Number(item.value) === simId)?.label || "";
                      setFormData((prev) => ({
                        ...prev,
                        fk_simid: simId,
                        simnno: selectedSim,
                      }));
                    }}
                    placeholder={t("fields.selectSim")}
                    isDark={isDark}
                    noOptionsMessage={t("fields.selectSim")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {t("fields.simNumber")}
                  </label>
                  <input
                    type="text"
                    name="simnno"
                    placeholder={t("fields.simNumberPlaceholder")}
                    value={formData.simnno}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    onFocus={(e) =>
                      (e.target.style.borderColor = selectedColor)
                    }
                    onBlur={(e) => (e.target.style.borderColor = "")}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  {t("fields.installationDate")}
                </label>
                <input
                  type="datetime-local"
                  name="installationDate"
                  value={
                    formData.installationDate
                      ? new Date(formData.installationDate)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      installationDate: new Date(e.target.value).toISOString(),
                    }))
                  }
                  className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                    isDark
                      ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  onFocus={(e) => (e.target.style.borderColor = selectedColor)}
                  onBlur={(e) => (e.target.style.borderColor = "")}
                  disabled={loading}
                />
              </div>

              {/* Description Field */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  {t("fields.remarks")}
                </label>
                <textarea
                  name="remarks"
                  placeholder={t("fields.remarksPlaceholder")}
                  value={formData.remarks}
                  onChange={handleChange}
                  rows={4}
                  className={`w-full px-4 py-2.5 rounded-lg border transition-colors resize-none ${
                    isDark
                      ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  onFocus={(e) => (e.target.style.borderColor = selectedColor)}
                  onBlur={(e) => (e.target.style.borderColor = "")}
                  disabled={loading}
                />
              </div>

              {/* Category Status Toggle */}
              <div className="bg-background rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1">
                      {t("section.statusTitle")}
                    </h3>
                    <p className="text-sm text-foreground opacity-60">
                      {t("section.statusDescription")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Cpu
                      className={`w-4 h-4 ${formData.isActive ? "text-green-500" : "text-gray-400"}`}
                    />
                    <button
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          isActive: prev.isActive ? 0 : 1,
                        }))
                      }
                      disabled={loading}
                      className="relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
                      style={{
                        backgroundColor: formData.isActive
                          ? selectedColor
                          : "#cbd5e1",
                      }}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          formData.isActive ? "translate-x-8" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
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
  );
};

export default AddEditDeviceMap;
