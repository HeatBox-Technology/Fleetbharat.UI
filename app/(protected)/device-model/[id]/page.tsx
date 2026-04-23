"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import { Card } from "@/components/CommonCard";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown from "@/components/SearchableDropdown";
import { Database, Layers, ShieldCheck } from "lucide-react";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import { 
  getDeviceModelById, postDeviceModel, updateDeviceModel, 
getDeviceCategoriesLookup, 
getOemManufacturersLookup
} from "@/services/deviceModelService";
import {DeviceModelFormData,  LookupOption } from "@/interfaces/deviceModel.interface";

const DeviceModelForm = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();
  const { id } = useParams();
  const isEditMode = Number(id) > 0;

  const [formData, setFormData] = useState<DeviceModelFormData>({
    code: "", displayName: "", description: "", manufacturerId: 0,
    deviceCategoryId: 0, protocolType: "", isEnabled: true
  });

  const [lookups, setLookups] = useState<{ mfr: LookupOption[], cat: LookupOption[] }>({ mfr: [], cat: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadForm = async () => {
      setLoading(true);
      const [mfrRes, catRes] = await Promise.all([getOemManufacturersLookup(), getDeviceCategoriesLookup()]);
      setLookups({ mfr: mfrRes.data, cat: catRes.data });

      if (isEditMode) {
        const res = await getDeviceModelById(Number(id));
        if (res.success) setFormData(res.data);
      }
      setLoading(false);
    };
    loadForm();
  }, [id, isEditMode]);

  const handleInputChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validate = () => {
    if (!formData.code || !formData.displayName || !formData.protocolType) return "Please fill required fields";
    if (formData.manufacturerId === 0 || formData.deviceCategoryId === 0) return "Select Manufacturer and Category";
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) return toast.error(error);

    setLoading(true);
    const res = isEditMode ? await updateDeviceModel(Number(id), formData) : await postDeviceModel(formData);
    setLoading(false);

    if (res.success) {
      toast.success(res.message);
      router.push("/device-model");
    } else {
      toast.error(res.message);
    }
  };

  const inputClass = (extra = "") =>
    `w-full px-3 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
      isDark
        ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
    } ${extra}`;

  const labelClass = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`;

  const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) => (
    <div className={`flex items-center gap-3 py-3 mb-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${selectedColor}20` }}>
        <Icon className="w-4 h-4" style={{ color: selectedColor }} />
      </div>
      <div>
        <h3 className={`text-sm font-bold uppercase tracking-widest ${isDark ? "text-foreground" : "text-gray-800"}`}>{title}</h3>
        {subtitle && <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{subtitle}</p>}
      </div>
    </div>
  );

  // Convert lookups to SearchableDropdown format
  const manufacturerOptions = lookups.mfr.map(m => ({ label: m.name, value: m.id }));
  const categoryOptions = lookups.cat.map(c => ({ label: c.name, value: c.id }));

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader isVisible={loading} />
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-3 sm:p-4 md:p-6`}>
        <div className="mb-6">
          <PageHeader
            title={isEditMode ? "Edit Device Model" : "Add Device Model"}
            subtitle={isEditMode ? "Update device model details" : "Register a new device model"}
            breadcrumbs={[
              { label: "Device Models", href: "/device-model" },
              { label: isEditMode ? "Edit" : "Add" },
            ]}
            showButton={false}
            showExportButton={false}
            showFilterButton={false}
            showBulkUpload={false}
          />
        </div>
        <Card isDark={isDark}>
          <div className="p-4 sm:p-6 space-y-8">
            {/* ── IDENTITY ── */}
            <div>
              <SectionHeader icon={ShieldCheck} title="Identity Details" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Code <span className="text-red-500">*</span></label>
                  <input name="code" value={formData.code} onChange={handleInputChange} placeholder="e.g. GV300" className={inputClass("uppercase")} maxLength={20} />
                </div>
                <div>
                  <label className={labelClass}>Display Name <span className="text-red-500">*</span></label>
                  <input name="displayName" value={formData.displayName} onChange={handleInputChange} placeholder="e.g. Queclink GV300" className={inputClass()} maxLength={40} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} rows={2} className={inputClass()} />
                </div>
              </div>
            </div>

            {/* ── HARDWARE ── */}
            <div>
              <SectionHeader icon={Layers} title="Hardware Specification" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Manufacturer <span className="text-red-500">*</span></label>
                  <SearchableDropdown
                    options={manufacturerOptions}
                    value={manufacturerOptions.find(opt => opt.value === formData.manufacturerId) || null}
                    onChange={opt => setFormData(prev => ({ ...prev, manufacturerId: opt?.value ? Number(opt.value) : 0 }))}
                    placeholder="Select Manufacturer"
                    isDark={isDark}
                  />
                </div>
                <div>
                  <label className={labelClass}>Device Category <span className="text-red-500">*</span></label>
                  <SearchableDropdown
                    options={categoryOptions}
                    value={categoryOptions.find(opt => opt.value === formData.deviceCategoryId) || null}
                    onChange={opt => setFormData(prev => ({ ...prev, deviceCategoryId: opt?.value ? Number(opt.value) : 0 }))}
                    placeholder="Select Category"
                    isDark={isDark}
                  />
                </div>
                <div>
                  <label className={labelClass}>Protocol Type <span className="text-red-500">*</span></label>
                  <input name="protocolType" value={formData.protocolType} onChange={handleInputChange} placeholder="JT808" className={inputClass()} />
                </div>
              </div>
            </div>

            {/* ── STATUS ── */}
            <div>
              <SectionHeader icon={Database} title="Operational Status" />
              <div className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                <div>
                  <p className="text-sm font-semibold">Status</p>
                  <p className="text-xs mt-0.5 uppercase tracking-wider font-medium text-gray-500">Controls global visibility in selectors.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: formData.isEnabled ? "#16a34a" : "#dc2626" }}>{formData.isEnabled ? "ENABLED" : "DISABLED"}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" name="isEnabled" checked={formData.isEnabled} onChange={handleInputChange} />
                    <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ backgroundColor: formData.isEnabled ? selectedColor : isDark ? "#374151" : "#D1D5DB" }}></div>
                  </label>
                </div>
              </div>
            </div>

            {/* ── ACTIONS ── */}
            <div className="form-footer-actions flex justify-end gap-3 pt-2">
              <button
                onClick={() => router.back()}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700" : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"}`}
              >
                Discard
              </button>
              <button
                onClick={handleSubmit}
                style={{ background: selectedColor }}
                className="px-4 py-2 text-sm rounded-lg font-medium text-white shadow-md hover:opacity-90"
                disabled={loading}
              >
                {loading ? "Saving..." : isEditMode ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DeviceModelForm;