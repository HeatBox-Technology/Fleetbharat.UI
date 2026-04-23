"use client";

import { Link2, MapPin } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getAllAccounts,
  getFormRightForPath,
  getGeofenceDropdownByAccount,
  getVehicleDropdown,
} from "@/services/commonServie";
import {
  getVehicleGeofenceById,
  saveVehicleGeofence,
  updateVehicleGeofence,
} from "@/services/vehicleGeofenceService";
import {
  resolveVehicleGeofenceDeviceNo,
  syncVehicleGeofenceToJava,
} from "@/services/vehicleGeofenceJavaSyncService";
import MultiSelect from "@/components/MultiSelect";

interface DropdownOption {
  id: number;
  value: string;
}

interface VehicleGeofenceFormData {
  accountId: number;
  vehicleIds: number[];
  geofenceIds: number[];
  remarks: string;
  isActive: boolean;
}

const AddEditVehicleGeofence: React.FC = () => {
  const { selectedColor } = useColor();
  const { isDark } = useTheme();
  const router = useRouter();
  const params = useParams();
  const t = useTranslations("pages.vehicleGeofence.detail");
  const tList = useTranslations("pages.vehicleGeofence.list");

  const assignmentId = params?.id ? Number(params.id) : 0;
  const isEditMode = assignmentId > 0;
  const pageRight = getFormRightForPath("/vehicle-geofence");
  const canRead = pageRight ? Boolean(pageRight.canRead) : true;
  const canSubmit = pageRight
    ? isEditMode
      ? Boolean(pageRight.canUpdate)
      : Boolean(pageRight.canWrite)
    : true;

  const [accounts, setAccounts] = useState<DropdownOption[]>([]);
  const [vehicles, setVehicles] = useState<DropdownOption[]>([]);
  const [geofences, setGeofences] = useState<DropdownOption[]>([]);

  const [formData, setFormData] = useState<VehicleGeofenceFormData>({
    accountId: 0,
    vehicleIds: [],
    geofenceIds: [],
    remarks: "",
    isActive: true,
  });
  const accountOptions = accounts.map((option) => ({
    value: String(option.id),
    label: option.value,
  }));
  const vehicleOptions = vehicles.map((option) => ({
    value: String(option.id),
    label: option.value,
  }));
  const geofenceOptions = geofences.map((option) => ({
    value: String(option.id),
    label: option.value,
  }));

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  const getVehicleLabelById = (id: number) =>
    vehicleOptions.find((option) => Number(option.value) === Number(id))?.label || "";

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

  const getUserData = () => {
    if (typeof window === "undefined") return { accountId: 0, userId: 0 };

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

  const getGeofenceDropdown = async (accountId?: number) => {
    const res = await getGeofenceDropdownByAccount(accountId);
    return toOptions(res);
  };

  const fetchDropdowns = async (accountId: number) => {
    try {
      const [accountsRes, vehiclesRes, geofencesRes] = await Promise.allSettled(
        [
          getAllAccounts(),
          getVehicleDropdown(accountId),
          getGeofenceDropdown(accountId),
        ],
      );

      if (accountsRes.status === "fulfilled") {
        setAccounts(toOptions(accountsRes.value));
      }
      if (vehiclesRes.status === "fulfilled") {
        setVehicles(toOptions(vehiclesRes.value));
      }
      if (geofencesRes.status === "fulfilled") {
        setGeofences(geofencesRes.value);
      }
    } catch (error) {
      console.error("Error fetching dropdowns:", error);
      toast.error(t("toast.loadDropdownFailed"));
    }
  };

  const fetchById = async () => {
    try {
      setFetchingData(true);
      const response = await getVehicleGeofenceById(assignmentId);
      const data = response?.data || response;

      if (!data) {
        toast.error(t("toast.notFound"));
        router.push("/vehicle-geofence");
        return;
      }

      setFormData({
        accountId: Number(data.accountId || 0),
        vehicleIds: Array.isArray(data.vehicleIds) ? data.vehicleIds : [Number(data.vehicleId || 0)],
        geofenceIds: Array.isArray(data.geofenceIds) ? data.geofenceIds : [Number(data.geofenceId || 0)],
        remarks: String(data.remarks || ""),
        isActive: Boolean(data.isActive),
      });

      await fetchDropdowns(Number(data.accountId || 0));
    } catch (error) {
      console.error("Error fetching assignment by id:", error);
      toast.error(t("toast.fetchFailed"));
      router.push("/vehicle-geofence");
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    const { accountId } = getUserData();
    setFormData((prev) => ({
      ...prev,
      accountId: prev.accountId || accountId,
    }));

    if (!isEditMode) {
      fetchDropdowns(accountId);
    }
  }, []);

  useEffect(() => {
    if (isEditMode) {
      fetchById();
    }
  }, [assignmentId]);

  useEffect(() => {
    if (!formData.accountId) {
      setVehicles([]);
      setGeofences([]);
      return;
    }

    Promise.allSettled([
      getVehicleDropdown(formData.accountId),
      getGeofenceDropdown(formData.accountId),
    ]).then(([vehicleRes, geofenceRes]) => {
      if (vehicleRes.status === "fulfilled") {
        setVehicles(toOptions(vehicleRes.value));
      }
      if (geofenceRes.status === "fulfilled") {
        setGeofences(geofenceRes.value);
      }
    });
  }, [formData.accountId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    const numberFields = ["accountId", "vehicleIds", "geofenceId"];
    setFormData((prev) => ({
      ...prev,
      [name]: numberFields.includes(name) ? Number(value) : value,
    }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error(
        isEditMode ? t("toast.noUpdatePermission") : t("toast.noAddPermission"),
      );
      return;
    }

    if (!formData.accountId) return toast.error(t("toast.selectAccount"));
    if (!formData.vehicleIds.length) return toast.error(t("toast.selectVehicle"));
    if (!formData.geofenceIds.length) return toast.error(t("toast.selectGeofence"));

    try {
      setLoading(true);
      let response:any;

      if (isEditMode) {
        const payload = {
          vehicleIds: formData.vehicleIds,
          geofenceIds: formData.geofenceIds,
          remarks: String(formData.remarks || ""),
          isActive: Boolean(formData.isActive),
        };
        response = await updateVehicleGeofence(assignmentId, payload);
      } else {
        const payload = {
          accountId: Number(formData.accountId),
          vehicleIds: formData.vehicleIds,
          geofenceIds: formData.geofenceIds,
          remarks: String(formData.remarks || ""),
        };
        response = await saveVehicleGeofence(payload);
      }

      if (response?.success || response?.statusCode === 200) {
        try {
          const resolvedDeviceNo = await resolveVehicleGeofenceDeviceNo({
            accountId: Number(formData.accountId),
            vehicleId: Number(formData.vehicleIds[0]),
            vehicleNo: getVehicleLabelById(formData.vehicleIds[0]),
          });

          await syncVehicleGeofenceToJava({
            accountId: Number(formData.accountId),
            vehicleId: Number(formData.vehicleIds[0]),
            vehicleNo: getVehicleLabelById(formData.vehicleIds[0]),
            deviceNo: resolvedDeviceNo,
            geofenceId: Number(formData.geofenceIds[0]),
          });
        } catch (javaError: any) {
          console.error("Error syncing vehicle geofence to Java:", javaError);
          toast.warning(
            javaError?.response?.data?.message ||
              "Saved locally, but Java sync failed",
          );
          router.push("/vehicle-geofence");
          return;
        }

        toast.success(
          response?.message ||
            (isEditMode ? t("toast.updated") : t("toast.created")),
        );
        router.push("/vehicle-geofence");
      } else {
        toast.error(response?.message || t("toast.saveFailed"));
      }
    } catch (error) {
      console.error("Error saving vehicle geofence:", error);
      toast.error(t("toast.saveError"));
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className={`${isDark ? "dark" : ""}`}>
        <ActionLoader isVisible={true} text="Loading assignment details..." />
        <div className="min-h-screen bg-background" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className={`${isDark ? "dark" : ""}`}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-foreground">{t("noReadPermission")}</p>
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
            { label: tList("breadcrumbs.current"), href: "/vehicle-geofence" },
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

        <div
          className={`rounded-2xl shadow-lg border-t-4 overflow-hidden ${
            isDark
              ? "bg-card border border-gray-800"
              : "bg-white border border-gray-200"
          }`}
          style={{ borderTopColor: selectedColor }}
        >
          <div
            className={`p-4 sm:p-6 md:p-8 ${isDark ? "bg-card" : "bg-white"}`}
          >
            <div className="flex items-start gap-3 mb-6">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${selectedColor}20` }}
              >
                <Link2 className="w-5 h-5" style={{ color: selectedColor }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">
                  {t("section.assignmentParameters")}
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
                  isDisabled={isEditMode || loading}
                  placeholder={t("fields.selectAccount")}
                  isDark={isDark}
                  noOptionsMessage={t("fields.selectAccount")}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  {t("fields.vehicle")} <span className="text-red-500">*</span>
                </label>
                <MultiSelect
                  options={vehicleOptions}
                  value={
                    vehicleOptions.filter(
                      (option) => formData.vehicleIds.includes(Number(option.value))
                    )
                  }
                  onChange={(option : any) =>
                    setFormData((prev) => ({
                      ...prev,
                      vehicleIds: Array.isArray(option) ? option.map((o) => Number(o.value)) : [Number(option?.value || 0)],
                    }))
                  }
                  isDisabled={loading}
                  name="All Vehicles"
                  placeholder={t("fields.selectVehicle")}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  {t("fields.geofence")} <span className="text-red-500">*</span>
                </label>
                <MultiSelect
                  options={geofenceOptions}
                  value={
                    geofenceOptions.filter(
                      (option) => formData.geofenceIds.includes(Number(option.value))
                    ) || null
                  }
                  onChange={(option) =>
                    setFormData((prev) => ({
                      ...prev,
                      geofenceIds: Array.isArray(option) ? option.map((o) => Number(o.value)) : [Number(option?.value || 0)],
                    }))
                  }
                  isDisabled={loading}
                  name="All Geofences"
                  placeholder={t("fields.selectGeofence")}
                  isDark={isDark}
                  noOptionsMessage={t("fields.selectGeofence")}
                />
              </div>
            </div>

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
                disabled={loading}
                className={`w-full px-4 py-2.5 rounded-lg border transition-colors resize-none ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
              />
            </div>

            {isEditMode && (
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
                    <MapPin
                      className={`w-4 h-4 ${formData.isActive ? "text-green-500" : "text-gray-400"}`}
                    />
                    <button
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          isActive: !prev.isActive,
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
            )}

            <div
              id="form-footer-actions"
              className="form-footer-actions flex justify-end gap-3"
            >
              <button
                onClick={() => router.push("/vehicle-geofence")}
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

export default AddEditVehicleGeofence;
