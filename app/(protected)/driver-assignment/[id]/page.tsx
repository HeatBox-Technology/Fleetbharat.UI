"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useColor } from "@/context/ColorContext";
import { toast } from "react-toastify";
import { Clock, LayoutGrid } from "lucide-react";
import { Card } from "@/components/CommonCard";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown from "@/components/SearchableDropdown";
import ActionLoader from "@/components/ActionLoader";

// Services
import { 
  getAssignmentById, 
  saveAssignment, 
  updateAssignment, 
  getVehiclesForDropdown 
} from "@/services/driverAssignmentService";
import { getDrivers } from "@/services/driverService";
import { getAllAccounts } from "@/services/commonServie";

// Interface for Dropdown Options to fix "type never" errors
interface DropdownOption {
  value: string;
  label: string;
}

const EditAssignment = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const isCreateMode = id === "0";

  const [loading, setLoading] = useState(!isCreateMode);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    accountId: "",
    driverId: "",
    vehicleId: "",
    basis: "PRIMARY",
    startTime: "",
    endTime: "",
    notes: ""
  });

  // Explicitly typing the options state to fix "Property does not exist on type never"
  const [options, setOptions] = useState<{
    accounts: DropdownOption[];
    drivers: DropdownOption[];
    vehicles: DropdownOption[];
  }>({ 
    accounts: [], 
    drivers: [], 
    vehicles: [] 
  });

  const inputClass = `w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
    isDark
      ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  }`;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accRes, drvRes, vehRes] = await Promise.all([
          getAllAccounts(),
          getDrivers(1, 100),
          getVehiclesForDropdown()
        ]);

        setOptions({
          // Adding type 'any' to parameters 'i' to fix implicit any errors
          accounts: (accRes?.data || accRes || []).map((i: any) => ({ 
            value: String(i.id || i.accountId || ""), 
            label: String(i.value || i.accountName || "") 
          })),
          drivers: (drvRes?.data?.pageData?.items || []).map((i: any) => ({ 
            value: String(i.driverId || ""), 
            label: String(i.name || "") 
          })),
          vehicles: (vehRes?.data?.pageData?.items || vehRes?.data || []).map((i: any) => ({ 
            value: String(i.vehicleId || i.id || ""), 
            label: String(i.vehiclePlate || i.plate || "") 
          }))
        });

        if (!isCreateMode && id) {
          const res = await getAssignmentById(id);
          if (res?.success && res.data) {
            const d = res.data;
            setFormData({
              accountId: String(d.accountId || ""),
              driverId: String(d.driverId || ""),
              vehicleId: String(d.vehicleId || ""),
              basis: d.basis || "PRIMARY",
              startTime: d.startTime ? d.startTime.substring(0, 16) : "",
              endTime: d.endTime ? d.endTime.substring(0, 16) : "",
              notes: d.notes || ""
            });
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isCreateMode]);

  const handleSubmit = async () => {
    if (!formData.driverId) return toast.error("Please select a driver");
    if (!formData.vehicleId) return toast.error("Please select a vehicle");
    if (!formData.startTime) return toast.error("Start time is required");

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        accountId: Number(formData.accountId),
        driverId: Number(formData.driverId),
        vehicleId: Number(formData.vehicleId),
      };

      const res = isCreateMode 
        ? await saveAssignment(payload) 
        : await updateAssignment(payload, id);

      if (res?.success || res?.statusCode === 200) {
        toast.success(isCreateMode ? "Assignment created" : "Assignment updated");
        router.push("/fleet/assignments");
      } else {
        toast.error(res?.message || "Operation failed");
      }
    } catch (error) {
      toast.error("Save error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ActionLoader isVisible={true} text="Loading details..." />;

  return (
    <div className={`${isDark ? "dark" : ""}`}>
      <ActionLoader isVisible={submitting} text="Processing Assignment..." />
      
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-2 mt-10`}>
        <PageHeader
          title={isCreateMode ? "New Assignment" : "Edit Assignment"}
          breadcrumbs={[
            { label: "Fleet" },
            { label: "Assignments", href: "/fleet/assignments" },
            { label: isCreateMode ? "New" : "Edit" }
          ]}
          showButton={false}
          buttonText={isCreateMode ? "Commit Assignment" : "Update Assignment"}
          onButtonClick={handleSubmit}
        />

        <div className="max-w-5xl mx-auto space-y-6 mt-4">
          <Card isDark={isDark}>
            <div className="p-8">
              <div className="flex items-start gap-3 mb-6">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${selectedColor}20` }}>
                  <LayoutGrid className="w-5 h-5" style={{ color: selectedColor }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1 uppercase">Identity Correlation</h2>
                  <p className="text-sm text-foreground opacity-60">Define the link between driver and vehicle</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Account Context</label>
                  <SearchableDropdown
                    options={options.accounts}
                    value={options.accounts.find(o => String(o.value) === String(formData.accountId)) || null}
                    onChange={(o: any) => setFormData({...formData, accountId: String(o?.value || "")})}
                    isDark={isDark}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Driver <span className="text-red-500">*</span></label>
                    <SearchableDropdown
                      options={options.drivers}
                      value={options.drivers.find(o => String(o.value) === String(formData.driverId)) || null}
                      onChange={(o: any) => setFormData({...formData, driverId: String(o?.value || "")})}
                      isDark={isDark}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Vehicle <span className="text-red-500">*</span></label>
                    <SearchableDropdown
                      options={options.vehicles}
                      value={options.vehicles.find(o => String(o.value) === String(formData.vehicleId)) || null}
                      onChange={(o: any) => setFormData({...formData, vehicleId: String(o?.value || "")})}
                      isDark={isDark}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Assignment Logic</label>
                  <div className="flex bg-background border border-border p-1 rounded-xl w-fit">
                    {["PRIMARY", "TEMPORARY"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, basis: type })}
                        className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${
                          formData.basis === type ? "text-white" : "text-foreground opacity-50"
                        }`}
                        style={formData.basis === type ? { backgroundColor: selectedColor } : {}}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card isDark={isDark}>
            <div className="p-8">
              <div className="flex items-start gap-3 mb-6">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${selectedColor}20` }}>
                  <Clock className="w-5 h-5" style={{ color: selectedColor }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1 uppercase">Shift Timing</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Start Time *</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Expected End</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Dispatcher Notes</label>
                <textarea
                  // CHANGED: rows={4} (number) instead of rows="4" (string)
                  rows={4}
                  className={inputClass}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3 pb-10">
            <button onClick={() => router.back()} className={`px-8 py-3 rounded-xl border ${isDark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-700"}`}>
              DISCARD
            </button>
            <button onClick={handleSubmit} className="px-8 py-3 rounded-xl font-bold text-white" style={{ backgroundColor: selectedColor }}>
              {isCreateMode ? "COMMIT ASSIGNMENT" : "UPDATE ASSIGNMENT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditAssignment;