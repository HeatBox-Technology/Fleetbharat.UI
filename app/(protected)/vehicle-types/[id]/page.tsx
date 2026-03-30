"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/CommonCard";
import ActionLoader from "@/components/ActionLoader";
import { useTheme } from "@/context/ThemeContext";
import { useColor } from "@/context/ColorContext";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-toastify";
import { Bike, Bus, Car, Info, MapPin, ShoppingBag, Truck } from "lucide-react";
import type { VehicleType, VehicleTypeFormData } from "@/interfaces/vehicleType.interface";
import {
  getVehicleTypeById,
  saveVehicleType,
  updateVehicleTypeById,
} from "@/services/vehicletypeService";

type ColorMode = "per-state" | "single";
type IconSize = "SM" | "MD" | "LG";

type IconSetMeta = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  category: string;
  defaultVehicleIcon: string;
  defaultAlarmIcon: string;
  fuelCategory: string;
  seatingCapacity: number;
  wheelsCount: number;
};

const iconOptions: IconSetMeta[] = [
  {
    id: "heavy-truck",
    label: "HEAVY TRUCK",
    icon: Truck,
    category: "HCV",
    defaultVehicleIcon: "container_truck.png",
    defaultAlarmIcon: "alarm_truck.png",
    fuelCategory: "Diesel",
    seatingCapacity: 2,
    wheelsCount: 10,
  },
  {
    id: "sedan",
    label: "SEDAN/SUV",
    icon: Car,
    category: "Car",
    defaultVehicleIcon: "car_sedan.png",
    defaultAlarmIcon: "alarm_car.png",
    fuelCategory: "Petrol",
    seatingCapacity: 5,
    wheelsCount: 4,
  },
  {
    id: "delivery-van",
    label: "DELIVERY VAN",
    icon: ShoppingBag,
    category: "LCV",
    defaultVehicleIcon: "pickup_van.png",
    defaultAlarmIcon: "alarm_truck.png",
    fuelCategory: "Diesel",
    seatingCapacity: 2,
    wheelsCount: 4,
  },
  {
    id: "two-wheeler",
    label: "TWO WHEELER",
    icon: Bike,
    category: "2W",
    defaultVehicleIcon: "bike.png",
    defaultAlarmIcon: "alarm_bike.png",
    fuelCategory: "Petrol",
    seatingCapacity: 2,
    wheelsCount: 2,
  },
  {
    id: "public-transport",
    label: "PUBLIC TRANSPORT",
    icon: Bus,
    category: "Bus",
    defaultVehicleIcon: "citybus.png",
    defaultAlarmIcon: "alarm_bus.png",
    fuelCategory: "Diesel",
    seatingCapacity: 40,
    wheelsCount: 6,
  },
];

const stateColors = [
  { label: "MOVING", color: "#10b981" },
  { label: "STOPPED", color: "#ef4444" },
  { label: "IDLE", color: "#f59e0b" },
  { label: "PARKED", color: "#3b82f6" },
  { label: "OFFLINE", color: "#71717a" },
];

const VehicleTypeForm: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();
  const params = useParams();
  const vehicleTypeId = Number(params.id);
  const isEditMode = vehicleTypeId > 0;

  const [formData, setFormData] = useState<VehicleTypeFormData>({
    code: "",
    displayName: "",
    speedLimit: 60,
    idleThreshold: 180,
    tankCapacity: 50,
    iconSet: "heavy-truck",
    colorMode: "per-state",
    iconSize: "MD",
    description: "",
    isEnabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  const resolveIconSet = (item: VehicleType): string => {
    const vehicleIcon = String(item.defaultVehicleIcon || "").toLowerCase();
    const category = String(item.category || "").toLowerCase();

    if (vehicleIcon.includes("truck") || category.includes("hcv")) return "heavy-truck";
    if (vehicleIcon.includes("bus") || category.includes("bus")) return "public-transport";
    if (vehicleIcon.includes("bike") || category.includes("2w")) return "two-wheeler";
    if (vehicleIcon.includes("van") || category.includes("lcv")) return "delivery-van";
    return "sedan";
  };

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

        setFormData((prev) => ({
          ...prev,
          code: item.vehicleTypeName || "",
          displayName: item.vehicleTypeName || "",
          speedLimit: Number(item.defaultSpeedLimit || 60),
          idleThreshold: Number(item.defaultIdleThreshold || 180),
          tankCapacity: Number(item.tankCapacity || 50),
          iconSet: resolveIconSet(item),
          description: "",
          isEnabled:
            ["true", "active", "enabled"].includes(
              String(item.status || "").trim().toLowerCase(),
            ),
        }));
      } finally {
        setFetchingData(false);
      }
    })();
  }, [isEditMode, vehicleTypeId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    const numericFields = ["speedLimit", "idleThreshold", "tankCapacity"];
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.displayName) {
      toast.error("Code and Display Name are required!");
      return;
    }

    const iconMeta =
      iconOptions.find((o) => o.id === formData.iconSet) || iconOptions[0];

    const payload = {
      id: 0,
      vehicleTypeName: formData.displayName.trim(),
      category: iconMeta.category,
      defaultVehicleIcon: iconMeta.defaultVehicleIcon,
      defaultAlarmIcon: iconMeta.defaultAlarmIcon,
      defaultIconColor:
        formData.colorMode === "single" ? selectedColor : stateColors[0].color,
      seatingCapacity: iconMeta.seatingCapacity,
      wheelsCount: iconMeta.wheelsCount,
      fuelCategory: iconMeta.fuelCategory,
      tankCapacity: String(formData.tankCapacity),
      defaultSpeedLimit: String(formData.speedLimit),
      defaultIdleThreshold: String(formData.idleThreshold),
      // send boolean-like value; service will normalise to Active/Inactive
      status: formData.isEnabled ? "Active" : "Inactive",
    };

    setLoading(true);
    try {
      const response = isEditMode
        ? await updateVehicleTypeById(vehicleTypeId, payload)
        : await saveVehicleType(payload);

      if (
        response?.success ||
        Number(response?.id || 0) > 0 ||
        Number(response?.data?.id || 0) > 0 ||
        response?.statusCode === 200 ||
        response?.statusCode === 201 ||
        response?.statusCode === 204
      ) {
        toast.success(response?.message || "Vehicle Type committed successfully!");
        router.push("/vehicle-types");
        return;
      }

      toast.error(response?.message || "Failed to save vehicle type.");
    } finally {
      setLoading(false);
    }
  };

  const getActiveIcon = () => {
    const option = iconOptions.find((o) => o.id === formData.iconSet);
    return option ? option.icon : Truck;
  };

  const ActiveIconComponent = getActiveIcon();

  return (
    <div className={`${isDark ? "dark text-foreground" : "text-gray-900"} mt-10 pb-20`}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{isEditMode ? "Edit Record" : "Create Record"}</h1>
          <p className="text-sm opacity-60">Vehicle Types Master Entity</p>
        </div>

        <Card isDark={isDark}>
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">Identity Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2 text-purple-500">Code *</label>
                <input
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                  placeholder="e.g. HDT-01"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2 text-purple-500">Display Name *</label>
                <input
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                  placeholder="e.g. Heavy Duty Truck"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card isDark={isDark}>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-purple-500 uppercase text-xs font-bold tracking-wider flex items-center gap-1">
                <Info size={14} /> Operational Defaults
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2">Default Speed Limit (KM/H)</label>
                <input
                  type="number"
                  name="speedLimit"
                  value={formData.speedLimit}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase opacity-60 mb-2">Idle Threshold (Sec)</label>
                <input
                  type="number"
                  name="idleThreshold"
                  value={formData.idleThreshold}
                  onChange={handleInputChange}
                  className={`w-full p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase opacity-60 mb-2 flex items-center gap-1">
                <span className="text-purple-500 inline-block rotate-45">*</span> Tank / Energy Capacity
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="tankCapacity"
                  value={formData.tankCapacity}
                  onChange={handleInputChange}
                  className={`w-32 p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                />
                <span className={`px-4 py-3 rounded-xl font-bold border ${isDark ? "bg-gray-800 border-gray-700 text-purple-400" : "bg-gray-50 text-purple-600 border-gray-200"}`}>L</span>
              </div>
            </div>
          </div>
        </Card>

        <Card isDark={isDark}>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-green-500 uppercase text-xs font-bold tracking-wider flex items-center gap-1">
                <MapPin size={14} /> Map & Visual Representation
              </span>
            </div>

            <div className="mb-8">
              <label className="block text-xs font-bold uppercase mb-4">Map Icon Set <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {iconOptions.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setFormData({ ...formData, iconSet: opt.id })}
                    className={`cursor-pointer p-4 rounded-xl flex flex-col items-center justify-center transition-all border-2 ${
                      formData.iconSet === opt.id
                        ? "bg-purple-50/10 border-purple-500"
                        : isDark ? "border-transparent bg-gray-800/50" : "border-transparent bg-gray-50"
                    }`}
                  >
                    <opt.icon size={28} className={formData.iconSet === opt.id ? "text-purple-500" : "opacity-40"} />
                    <span className={`text-[10px] mt-2 font-bold text-center ${formData.iconSet === opt.id ? "text-purple-500" : "opacity-40"}`}>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <label className="block text-xs font-bold uppercase mb-3">Colour Mode</label>
                <div className={`inline-flex p-1 rounded-xl ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                  {["per-state", "single"].map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setFormData({ ...formData, colorMode: mode as ColorMode })}
                      className={`px-4 py-2 rounded-lg text-xs font-bold capitalize ${
                        formData.colorMode === mode
                          ? (isDark ? "bg-gray-700 shadow-lg" : "bg-white shadow-sm")
                          : "opacity-50"
                      }`}
                    >
                      {mode.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-3">Map Icon Size</label>
                <div className={`inline-flex p-1 rounded-xl ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                  {["SM", "MD", "LG"].map((size) => (
                    <button
                      type="button"
                      key={size}
                      onClick={() => setFormData({ ...formData, iconSize: size as IconSize })}
                      className={`px-6 py-2 rounded-lg text-xs font-bold ${
                        formData.iconSize === size
                          ? (isDark ? "bg-gray-700 shadow-lg" : "bg-white shadow-sm")
                          : "opacity-50"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-xs font-bold uppercase mb-4 opacity-60">State Colours Mapping</label>
              <div className="space-y-4">
                {stateColors.map((state) => (
                  <div key={state.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: state.color }}></div>
                      <span className="text-xs font-bold opacity-80">{state.label}</span>
                    </div>
                    <span className="text-xs font-mono opacity-40 uppercase">{state.color}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-dashed border-gray-600/20 pt-6">
              <label className="block text-xs font-bold uppercase mb-4 opacity-60">Real-time Map Preview</label>
              <div className={`p-8 rounded-2xl flex justify-center gap-8 ${isDark ? "bg-gray-800/30" : "bg-gray-50"}`}>
                <div className="flex flex-col items-center gap-2">
                  <ActiveIconComponent style={{ color: "#10b981" }} size={formData.iconSize === "SM" ? 24 : formData.iconSize === "MD" ? 32 : 40} />
                  <span className="text-[10px] font-bold opacity-50">MOVING</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <ActiveIconComponent style={{ color: "#ef4444" }} size={formData.iconSize === "SM" ? 24 : formData.iconSize === "MD" ? 32 : 40} />
                  <span className="text-[10px] font-bold opacity-50">STOPPED</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <ActiveIconComponent style={{ color: "#f59e0b" }} size={formData.iconSize === "SM" ? 24 : formData.iconSize === "MD" ? 32 : 40} />
                  <span className="text-[10px] font-bold opacity-50">IDLE</span>
                </div>
              </div>
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
              <h2 className="text-sm font-bold uppercase tracking-tight">Operational Lifecycle Status</h2>
              <p className="text-[10px] opacity-50 uppercase mt-1">Status determines global visibility in registry selectors.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-green-500">ENABLED</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={formData.isEnabled} onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })} className="sr-only peer" />
                <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </Card>

        <div className="flex gap-4 pt-4">
          <button
            onClick={() => router.back()}
            className={`flex-1 py-4 rounded-xl font-bold border transition-colors ${
              isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-white border-gray-200 hover:bg-gray-50 text-gray-600"
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
