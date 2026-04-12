"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/CommonCard";
import ActionLoader from "@/components/ActionLoader";
import { useTheme } from "@/context/ThemeContext";
import { useColor } from "@/context/ColorContext";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import { CircleGauge, Upload, X, Zap } from "lucide-react";
import SearchableDropdown from "@/components/SearchableDropdown";
import type { VehicleType, VehicleTypeFormData } from "@/interfaces/vehicleType.interface";
import { getAccountHierarchy } from "@/services/accountService";
import {
  getVehicleTypeById,
  saveVehicleType,
  updateVehicleTypeById,
  uploadVehicleTypeIcons,
} from "@/services/vehicletypeService";

type IconKey =
  | "movingIcon"
  | "stoppedIcon"
  | "idleIcon"
  | "parkedIcon"
  | "offlineIcon"
  | "breakdownIcon";

type FileKey = `${IconKey}File`;

type IconState = Record<IconKey, string>;
type IconFileState = Record<FileKey, File | null>;

const iconLabels: Array<{ key: IconKey; label: string }> = [
  { key: "movingIcon", label: "MOVING" },
  { key: "stoppedIcon", label: "STOPPED" },
  { key: "idleIcon", label: "IDLE" },
  { key: "parkedIcon", label: "PARKED" },
  { key: "offlineIcon", label: "OFFLINE" },
  { key: "breakdownIcon", label: "BREAKDOWN" },
];

const emptyIcons: IconState = {
  movingIcon: "",
  stoppedIcon: "",
  idleIcon: "",
  parkedIcon: "",
  offlineIcon: "",
  breakdownIcon: "",
};

const emptyFiles: IconFileState = {
  movingIconFile: null,
  stoppedIconFile: null,
  idleIconFile: null,
  parkedIconFile: null,
  offlineIconFile: null,
  breakdownIconFile: null,
};

const resolveAssetUrl = (path?: string | null) => {
  const value = String(path || "").trim();
  if (!value) return "";
  if (/^(https?:\/\/|blob:)/i.test(value)) return value;
  const baseUrl = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
    /\/+$/,
    "",
  );
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

const VehicleTypeForm: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();
  const params = useParams();
  const vehicleTypeId = Number(params.id);
  const isEditMode = vehicleTypeId > 0;
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [formData, setFormData] = useState<VehicleTypeFormData>({
    code: "",
    displayName: "",
    accountId: 0,
    category: "",
    speedLimit: 60,
    idleThreshold: 5,
    tankCapacity: 50,
    seatingCapacity: 0,
    wheelsCount: 0,
    fuelCategory: "",
    description: "",
    isEnabled: true,
  });
  const [icons, setIcons] = useState<IconState>(emptyIcons);
  const [iconFiles, setIconFiles] = useState<IconFileState>(emptyFiles);
  const [accounts, setAccounts] = useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  const getLoggedInAccountId = () => {
    if (typeof window === "undefined") return 0;
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return Number(user?.accountId || 0);
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await getAccountHierarchy();
        const accountList = Array.isArray(response?.data) ? response.data : [];
        setAccounts(
          accountList.map((item: { id?: number; value?: string; name?: string }) => ({
            value: Number(item?.id || 0),
            label: String(item?.value || item?.name || item?.id || ""),
          })),
        );
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };

    fetchAccounts();
    const accountId = getLoggedInAccountId();
    if (accountId > 0) {
      setFormData((prev) => ({
        ...prev,
        accountId: prev.accountId || accountId,
      }));
    }
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      setFetchingData(true);
      try {
        const response = await getVehicleTypeById(vehicleTypeId);
        const item: VehicleType | null =
          (response?.data as VehicleType) ||
          (response as VehicleType) ||
          null;

        if (!item || typeof item !== "object") {
          toast.error(response?.message || "Failed to load vehicle type details.");
          return;
        }

        setFormData({
          code: item.vehicleTypeName
            ? `${item.vehicleTypeName.slice(0, 3).toUpperCase()}-${item.id}`
            : `VT-${item.id}`,
          displayName: item.vehicleTypeName || "",
          accountId: Number(item.accountId || getLoggedInAccountId() || 0),
          category: item.category || "",
          speedLimit: Number(item.defaultSpeedLimit || 60),
          idleThreshold: Number(item.defaultIdleThreshold || 5),
          tankCapacity: Number(item.tankCapacity || 0),
          seatingCapacity: Number(item.seatingCapacity || 0),
          wheelsCount: Number(item.wheelsCount || 0),
          fuelCategory: item.fuelCategory || "",
          description: "",
          isEnabled: ["true", "active", "enabled"].includes(
            String(item.status || "").trim().toLowerCase(),
          ),
        });

        setIcons({
          movingIcon: String(item.movingIcon || ""),
          stoppedIcon: String(item.stoppedIcon || ""),
          idleIcon: String(item.idleIcon || ""),
          parkedIcon: String(item.parkedIcon || ""),
          offlineIcon: String(item.offlineIcon || ""),
          breakdownIcon: String(item.breakdownIcon || ""),
        });
      } finally {
        setFetchingData(false);
      }
    })();
  }, [isEditMode, vehicleTypeId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    const numericFields = [
      "speedLimit",
      "idleThreshold",
      "tankCapacity",
      "seatingCapacity",
      "wheelsCount",
    ];
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  };

  const handleIconSelect = (
    iconKey: IconKey,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileKey = `${iconKey}File` as FileKey;
    const previewUrl = URL.createObjectURL(file);

    setIconFiles((prev) => ({
      ...prev,
      [fileKey]: file,
    }));
    setIcons((prev) => ({
      ...prev,
      [iconKey]: previewUrl,
    }));
  };

  const clearIcon = (iconKey: IconKey) => {
    const fileKey = `${iconKey}File` as FileKey;
    setIconFiles((prev) => ({
      ...prev,
      [fileKey]: null,
    }));
    setIcons((prev) => ({
      ...prev,
      [iconKey]: "",
    }));

    const input = fileInputRefs.current[iconKey];
    if (input) {
      input.value = "";
    }
  };

  const hasPendingIconUploads = Object.values(iconFiles).some(Boolean);

  const handleSubmit = async () => {
    if (!formData.displayName.trim()) {
      toast.error("Display Name is required.");
      return;
    }
    if (!formData.accountId) {
      toast.error("Account is required.");
      return;
    }
    if (!formData.category.trim()) {
      toast.error("Category is required.");
      return;
    }

    const payload = {
      id: isEditMode ? vehicleTypeId : 0,
      accountId: Number(formData.accountId || 0),
      vehicleTypeName: formData.displayName.trim(),
      category: formData.category.trim(),
      movingIcon: icons.movingIcon || null,
      stoppedIcon: icons.stoppedIcon || null,
      idleIcon: icons.idleIcon || null,
      parkedIcon: icons.parkedIcon || null,
      offlineIcon: icons.offlineIcon || null,
      breakdownIcon: icons.breakdownIcon || null,
      seatingCapacity: Number(formData.seatingCapacity || 0),
      wheelsCount: Number(formData.wheelsCount || 0),
      fuelCategory: formData.fuelCategory.trim(),
      tankCapacity: String(formData.tankCapacity || ""),
      defaultSpeedLimit: String(formData.speedLimit || ""),
      defaultIdleThreshold: String(formData.idleThreshold || ""),
      status: formData.isEnabled ? "Active" : "Inactive",
    };

    setLoading(true);
    try {
      const response = isEditMode
        ? await updateVehicleTypeById(vehicleTypeId, payload)
        : await saveVehicleType(payload);

      const resolvedVehicleTypeId = Number(
        response?.data?.id || response?.id || vehicleTypeId,
      );

      if (
        !(
          response?.success ||
          resolvedVehicleTypeId > 0 ||
          response?.statusCode === 200 ||
          response?.statusCode === 201 ||
          response?.statusCode === 204
        )
      ) {
        toast.error(response?.message || "Failed to save vehicle type.");
        return;
      }

      if (hasPendingIconUploads) {
        const accountId = getLoggedInAccountId();
        if (!accountId || !resolvedVehicleTypeId) {
          toast.error("Vehicle type saved, but icon upload could not start.");
          return;
        }

        const uploadResponse = await uploadVehicleTypeIcons(
          accountId,
          resolvedVehicleTypeId,
          iconFiles,
        );

        if (
          !(
            uploadResponse?.success ||
            uploadResponse?.vehicleTypeId ||
            uploadResponse?.data?.vehicleTypeId ||
            uploadResponse?.statusCode === 200 ||
            uploadResponse?.statusCode === 201
          )
        ) {
          toast.error(
            uploadResponse?.message ||
              "Vehicle type saved, but icon upload failed.",
          );
          return;
        }
      }

      toast.success(
        hasPendingIconUploads
          ? "Vehicle type and icons saved successfully!"
          : response?.message || "Vehicle type saved successfully!",
      );
      router.push("/vehicle-types");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`${isDark ? "dark text-foreground" : "text-gray-900"} mt-10 pb-20`}
    >
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <ActionLoader
          isVisible={fetchingData || loading}
          text={
            fetchingData
              ? "Loading vehicle type details..."
              : isEditMode
                ? "Updating vehicle type..."
                : "Creating vehicle type..."
          }
        />

        <div className="mb-2">
          <h1 className="text-2xl font-bold">
            {isEditMode ? "Edit Record" : "Create Record"}
          </h1>
          <p className="text-sm opacity-60">Vehicle Types Master Entity</p>
        </div>

        <Card isDark={isDark}>
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">Identity Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2 text-purple-500">
                  Account *
                </label>
                <SearchableDropdown
                  options={accounts}
                  value={
                    accounts.find(
                      (option) => Number(option.value) === Number(formData.accountId),
                    ) || null
                  }
                  onChange={(option) =>
                    setFormData((prev) => ({
                      ...prev,
                      accountId: Number(option?.value || 0),
                    }))
                  }
                  placeholder="Select Account"
                  isDark={isDark}
                  noOptionsMessage="No account found"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2 text-purple-500">
                  Code
                </label>
                <input
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                  placeholder="e.g. HDT-01"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2 text-purple-500">
                  Display Name *
                </label>
                <input
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                  placeholder="e.g. Heavy Duty Truck"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2">
                  Category *
                </label>
                <input
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                  placeholder="e.g. Heavy"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2">
                  Fuel Category
                </label>
                <input
                  name="fuelCategory"
                  value={formData.fuelCategory}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                  placeholder="e.g. Diesel"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card isDark={isDark}>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-purple-500 uppercase text-xs font-bold tracking-wider flex items-center gap-1">
                <Zap size={14} /> Operational Defaults
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2">
                  Default Speed Limit (KM/H)
                </label>
                <input
                  type="number"
                  name="speedLimit"
                  value={formData.speedLimit}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2">
                  Idle Threshold
                </label>
                <input
                  type="number"
                  name="idleThreshold"
                  value={formData.idleThreshold}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2">
                  Tank / Energy Capacity
                </label>
                <input
                  type="number"
                  name="tankCapacity"
                  value={formData.tankCapacity}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2">
                  Seating Capacity
                </label>
                <input
                  type="number"
                  name="seatingCapacity"
                  value={formData.seatingCapacity}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2">
                  Wheels Count
                </label>
                <input
                  type="number"
                  name="wheelsCount"
                  value={formData.wheelsCount}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card isDark={isDark}>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-green-500 uppercase text-xs font-bold tracking-wider flex items-center gap-1">
                <CircleGauge size={14} /> Vehicle Icons
              </span>
            </div>

            <label className="block text-xs font-bold uppercase mb-4 opacity-60">
              Custom state icons (optional upload)
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {iconLabels.map(({ key, label }) => (
                <div
                  key={key}
                  className={`rounded-xl border p-3 flex items-center gap-3 ${isDark ? "border-gray-700 bg-gray-800/40" : "border-gray-200 bg-white"}`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-cyan-200 shrink-0 bg-gray-100">
                    {icons[key] ? (
                      <img
                        src={resolveAssetUrl(icons[key])}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold">{label}</div>
                    <div className="text-[10px] opacity-50 truncate">
                      {iconFiles[`${key}File` as FileKey]?.name ||
                        icons[key] ||
                        "No file selected"}
                    </div>
                  </div>
                  <input
                    ref={(node) => {
                      fileInputRefs.current[key] = node;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleIconSelect(key, event)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[key]?.click()}
                    className="px-3 py-2 rounded-lg text-[10px] font-bold border border-gray-200 bg-white text-gray-700 shadow-sm"
                  >
                    <Upload className="w-3 h-3 inline mr-1" />
                    UPLOAD
                  </button>
                  <button
                    type="button"
                    onClick={() => clearIcon(key)}
                    className="text-red-500"
                    aria-label={`Clear ${label} icon`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card isDark={isDark}>
          <div className="p-6">
            <label className="block text-sm font-bold mb-3">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="Provide historical context or technical specifics..."
              className={`w-full p-4 rounded-xl border transition-colors ${
                isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
              } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
            />
          </div>
        </Card>

        <Card isDark={isDark}>
          <div className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-tight">
                Operational Lifecycle Status
              </h2>
              <p className="text-[10px] opacity-50 uppercase mt-1">
                Status determines global visibility in registry selectors.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-green-500">ENABLED</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isEnabled: e.target.checked,
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
              </label>
            </div>
          </div>
        </Card>

        <div className="flex gap-4 pt-4">
          <button
            onClick={() => router.back()}
            className={`flex-1 py-4 rounded-xl font-bold border transition-colors ${
              isDark
                ? "bg-gray-800 border-gray-700 hover:bg-gray-700"
                : "bg-white border-gray-200 hover:bg-gray-50 text-gray-600"
            }`}
          >
            DISCARD
          </button>
          <button
            onClick={handleSubmit}
            style={{ background: selectedColor }}
            className="flex-[2] py-4 rounded-xl font-bold text-white shadow-lg shadow-purple-500/20 hover:opacity-90 transition-opacity uppercase tracking-widest"
          >
            Commit Entry
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleTypeForm;
