"use client";

import { Clock, LayoutGrid } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import { Card } from "@/components/CommonCard";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown, {
  type SearchableOption,
} from "@/components/SearchableDropdown";
import { useColor } from "@/context/ColorContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getAllAccounts,
  getDriverDropdown,
  getVehicleDropdown,
} from "@/services/commonServie";
import {
  getAssignmentById,
  saveAssignment,
  toAssignmentFormModel,
  updateAssignment,
} from "@/services/driverAssignmentService";

interface DropdownOption {
  value: string;
  label: string;
}

interface AssignmentFormData {
  accountContextId: string;
  driverId: string;
  vehicleId: string;
  assignmentLogic: "Primary" | "Temporary";
  startTime: string;
  expectedEnd: string;
  dispatcherNotes: string;
}

type FieldErrors = Partial<
  Record<keyof AssignmentFormData | "createdByUser" | "updatedByUser", string>
>;

const ASSIGNMENT_LOGIC_REGEX = /^(Primary|Temporary)$/i;
const NOTES_REGEX = /^[A-Za-z0-9 .,;:()@_\-/&]*$/;

const defaultFormData: AssignmentFormData = {
  accountContextId: "",
  driverId: "",
  vehicleId: "",
  assignmentLogic: "Primary",
  startTime: "",
  expectedEnd: "",
  dispatcherNotes: "",
};

const toDropdownOptions = (
  response: unknown,
  valueKeys: string[],
  labelKeys: string[],
): DropdownOption[] => {
  const responseRecord =
    response && typeof response === "object"
      ? (response as Record<string, unknown>)
      : null;
  const responseData = responseRecord?.data;

  const data = Array.isArray(responseData)
    ? responseData
    : Array.isArray(response)
      ? response
      : [];

  return data
    .map((item) => {
      const record =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};

      const resolvedValue = valueKeys
        .map((key) => record?.[key])
        .find(
          (val) =>
            val !== undefined && val !== null && String(val).trim() !== "",
        );

      const resolvedLabel = labelKeys
        .map((key) => record?.[key])
        .find(
          (val) =>
            val !== undefined && val !== null && String(val).trim() !== "",
        );

      return {
        value: String(resolvedValue ?? ""),
        label: String(resolvedLabel ?? ""),
      };
    })
    .filter((item: DropdownOption) => item.value && item.label);
};

const getUserContext = () => {
  if (typeof window === "undefined") {
    return { accountId: 0, numericUserId: 0, userGuid: "" };
  }

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const accountId = Number(user?.accountId || user?.AccountId || 0);
    const numericUserId = Number(
      user?.id || user?.userNumericId || user?.UserNumericId || 0,
    );
    const userGuid = String(user?.userId || user?.UserId || "").trim();

    return {
      accountId: Number.isFinite(accountId) ? accountId : 0,
      numericUserId: Number.isFinite(numericUserId) ? numericUserId : 0,
      userGuid,
    };
  } catch {
    return { accountId: 0, numericUserId: 0, userGuid: "" };
  }
};

const EditAssignment = () => {
  const { isDark } = useTheme();
  const { selectedColor } = useColor();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const isCreateMode = id === "0";

  const [loading, setLoading] = useState(!isCreateMode);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<AssignmentFormData>(defaultFormData);

  const [options, setOptions] = useState<{
    accounts: DropdownOption[];
    drivers: DropdownOption[];
    vehicles: DropdownOption[];
  }>({
    accounts: [],
    drivers: [],
    vehicles: [],
  });

  const inputClass = `w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
    isDark
      ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  }`;

  const errorTextClass = "text-xs text-red-500 mt-1";

  const validateForm = (data: AssignmentFormData): FieldErrors => {
    const errors: FieldErrors = {};

    if (!Number(data.accountContextId)) {
      errors.accountContextId = "Account is required";
    }
    if (!Number(data.driverId)) {
      errors.driverId = "Driver is required";
    }
    if (!Number(data.vehicleId)) {
      errors.vehicleId = "Vehicle is required";
    }
    if (
      !data.assignmentLogic ||
      !ASSIGNMENT_LOGIC_REGEX.test(data.assignmentLogic)
    ) {
      errors.assignmentLogic = "Assignment logic must be Primary or Temporary";
    }
    if (!data.startTime) {
      errors.startTime = "Start time is required";
    } else if (!Number.isFinite(new Date(data.startTime).getTime())) {
      errors.startTime = "Start time is invalid";
    }
    if (
      data.expectedEnd &&
      !Number.isFinite(new Date(data.expectedEnd).getTime())
    ) {
      errors.expectedEnd = "Expected end is invalid";
    }
    if (
      data.startTime &&
      data.expectedEnd &&
      Number.isFinite(new Date(data.startTime).getTime()) &&
      Number.isFinite(new Date(data.expectedEnd).getTime()) &&
      new Date(data.expectedEnd) < new Date(data.startTime)
    ) {
      errors.expectedEnd = "Expected end cannot be earlier than start time";
    }
    if (data.dispatcherNotes.length > 500) {
      errors.dispatcherNotes = "Dispatcher notes cannot exceed 500 characters";
    } else if (
      data.dispatcherNotes &&
      !NOTES_REGEX.test(data.dispatcherNotes)
    ) {
      errors.dispatcherNotes =
        "Dispatcher notes contain unsupported characters";
    }

    return errors;
  };

  const fetchDropdowns = useCallback(async (accountContextId: string) => {
    const resolvedAccountId = Number(accountContextId || 0);

    const [driversRes, vehiclesRes] = await Promise.all([
      getDriverDropdown(resolvedAccountId || undefined),
      getVehicleDropdown(resolvedAccountId || undefined),
    ]);

    setOptions((prev) => ({
      ...prev,
      drivers: toDropdownOptions(
        driversRes,
        ["driverId", "id", "value"],
        ["name", "driverName", "label", "value", "mobile"],
      ),
      vehicles: toDropdownOptions(
        vehiclesRes,
        ["vehicleId", "id", "value"],
        ["vehicleNumber", "vehiclePlate", "plate", "name", "label", "value"],
      ),
    }));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userContext = getUserContext();
        const accountRes = await getAllAccounts();
        const accountOptions = toDropdownOptions(
          accountRes,
          ["id", "accountId", "value"],
          ["value", "accountName", "label", "name"],
        );
        const accountContextId =
          userContext.accountId > 0 ? String(userContext.accountId) : "";

        setOptions((prev) => ({
          ...prev,
          accounts: accountOptions,
        }));

        if (accountContextId) {
          setFormData((prev) => ({
            ...prev,
            accountContextId: prev.accountContextId || accountContextId,
          }));
          await fetchDropdowns(accountContextId);
        }

        if (!isCreateMode && id) {
          const res = await getAssignmentById(id);
          if (res?.success && res?.data) {
            const model = toAssignmentFormModel(res.data);
            setFormData({
              ...model,
              assignmentLogic:
                String(model.assignmentLogic).toLowerCase() === "temporary"
                  ? "Temporary"
                  : "Primary",
            });
            if (model.accountContextId) {
              await fetchDropdowns(model.accountContextId);
            }
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
        toast.error("Failed to load assignment form data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchDropdowns, id, isCreateMode]);

  useEffect(() => {
    if (!formData.accountContextId) return;

    fetchDropdowns(formData.accountContextId).catch((error) => {
      console.error("Dropdown fetch error:", error);
      toast.error("Failed to load drivers/vehicles");
    });
  }, [fetchDropdowns, formData.accountContextId]);

  const handleFieldChange = <K extends keyof AssignmentFormData>(
    key: K,
    value: AssignmentFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = async () => {
    const errors = validateForm(formData);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSubmitting(true);
    try {
      const userContext = getUserContext();
      const actorId = Number(
        userContext.numericUserId || formData.accountContextId || 0,
      );
      const actorGuid = String(userContext.userGuid || "").trim();

      const payload = {
        accountContextId: Number(formData.accountContextId),
        driverId: Number(formData.driverId),
        vehicleId: Number(formData.vehicleId),
        assignmentLogic: formData.assignmentLogic,
        startTime: formData.startTime,
        expectedEnd: formData.expectedEnd || null,
        dispatcherNotes: formData.dispatcherNotes.trim(),
        ...(isCreateMode
          ? {
              createdBy: actorId,
              createdByUser: actorGuid,
            }
          : {
              updatedBy: actorId,
              updatedByUser: actorGuid,
            }),
      };

      const res = isCreateMode
        ? await saveAssignment(payload)
        : await updateAssignment(payload, id);

      if (res?.success || res?.statusCode === 200) {
        toast.success(
          isCreateMode ? "Assignment created" : "Assignment updated",
        );
        router.push("/driver-assignment");
      } else {
        if (res?.errors && typeof res.errors === "object") {
          setFieldErrors((prev) => ({ ...prev, ...res.errors }));
        }
        toast.error(res?.message || "Operation failed");
      }
    } catch {
      toast.error("Save error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return <ActionLoader isVisible={true} text="Loading details..." />;

  return (
    <div className={`${isDark ? "dark" : ""}`}>
      <ActionLoader isVisible={submitting} text="Processing Assignment..." />

      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-2 mt-10`}
      >
        <PageHeader
          title={isCreateMode ? "New Assignment" : "Edit Assignment"}
          breadcrumbs={[
            { label: "Fleet" },
            { label: "Assignments", href: "/driver-assignment" },
            { label: isCreateMode ? "New" : "Edit" },
          ]}
          showButton={false}
          buttonText={isCreateMode ? "Commit Assignment" : "Update Assignment"}
          onButtonClick={handleSubmit}
        />

        <div className="max-w-5xl mx-auto space-y-6 mt-4">
          <Card isDark={isDark}>
            <div className="p-8">
              <div className="flex items-start gap-3 mb-6">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${selectedColor}20` }}
                >
                  <LayoutGrid
                    className="w-5 h-5"
                    style={{ color: selectedColor }}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1 uppercase">
                    Identity Correlation
                  </h2>
                  <p className="text-sm text-foreground opacity-60">
                    Define the link between driver and vehicle
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <div className="block text-sm font-semibold text-foreground mb-2">
                    Account Context <span className="text-red-500">*</span>
                  </div>
                  <SearchableDropdown
                    options={options.accounts}
                    value={
                      options.accounts.find(
                        (o) =>
                          String(o.value) === String(formData.accountContextId),
                      ) || null
                    }
                    onChange={(o: SearchableOption | null) =>
                      handleFieldChange(
                        "accountContextId",
                        String(o?.value || ""),
                      )
                    }
                    isDark={isDark}
                  />
                  {fieldErrors.accountContextId && (
                    <p className={errorTextClass}>
                      {fieldErrors.accountContextId}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <div className="block text-sm font-semibold text-foreground mb-2">
                      Driver <span className="text-red-500">*</span>
                    </div>
                    <SearchableDropdown
                      options={options.drivers}
                      value={
                        options.drivers.find(
                          (o) => String(o.value) === String(formData.driverId),
                        ) || null
                      }
                      onChange={(o: SearchableOption | null) =>
                        handleFieldChange("driverId", String(o?.value || ""))
                      }
                      isDark={isDark}
                    />
                    {fieldErrors.driverId && (
                      <p className={errorTextClass}>{fieldErrors.driverId}</p>
                    )}
                  </div>
                  <div>
                    <div className="block text-sm font-semibold text-foreground mb-2">
                      Vehicle <span className="text-red-500">*</span>
                    </div>
                    <SearchableDropdown
                      options={options.vehicles}
                      value={
                        options.vehicles.find(
                          (o) => String(o.value) === String(formData.vehicleId),
                        ) || null
                      }
                      onChange={(o: SearchableOption | null) =>
                        handleFieldChange("vehicleId", String(o?.value || ""))
                      }
                      isDark={isDark}
                    />
                    {fieldErrors.vehicleId && (
                      <p className={errorTextClass}>{fieldErrors.vehicleId}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="block text-sm font-semibold text-foreground mb-2">
                    Assignment Logic <span className="text-red-500">*</span>
                  </div>
                  <div className="flex bg-background border border-border p-1 rounded-xl w-fit">
                    {["Primary", "Temporary"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          handleFieldChange(
                            "assignmentLogic",
                            type as "Primary" | "Temporary",
                          )
                        }
                        className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${
                          formData.assignmentLogic === type
                            ? "text-white"
                            : "text-foreground opacity-50"
                        }`}
                        style={
                          formData.assignmentLogic === type
                            ? { backgroundColor: selectedColor }
                            : {}
                        }
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {fieldErrors.assignmentLogic && (
                    <p className={errorTextClass}>
                      {fieldErrors.assignmentLogic}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card isDark={isDark}>
            <div className="p-8">
              <div className="flex items-start gap-3 mb-6">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${selectedColor}20` }}
                >
                  <Clock className="w-5 h-5" style={{ color: selectedColor }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1 uppercase">
                    Shift Timing
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label
                    htmlFor="assignmentStartTime"
                    className="block text-sm font-semibold text-foreground mb-2"
                  >
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="assignmentStartTime"
                    type="datetime-local"
                    className={inputClass}
                    value={formData.startTime}
                    onChange={(e) =>
                      handleFieldChange("startTime", e.target.value)
                    }
                  />
                  {fieldErrors.startTime && (
                    <p className={errorTextClass}>{fieldErrors.startTime}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="assignmentExpectedEnd"
                    className="block text-sm font-semibold text-foreground mb-2"
                  >
                    Expected End
                  </label>
                  <input
                    id="assignmentExpectedEnd"
                    type="datetime-local"
                    className={inputClass}
                    value={formData.expectedEnd}
                    onChange={(e) =>
                      handleFieldChange("expectedEnd", e.target.value)
                    }
                  />
                  {fieldErrors.expectedEnd && (
                    <p className={errorTextClass}>{fieldErrors.expectedEnd}</p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="assignmentDispatcherNotes"
                  className="block text-sm font-semibold text-foreground mb-2"
                >
                  Dispatcher Notes
                </label>
                <textarea
                  id="assignmentDispatcherNotes"
                  rows={4}
                  className={inputClass}
                  value={formData.dispatcherNotes}
                  onChange={(e) =>
                    handleFieldChange("dispatcherNotes", e.target.value)
                  }
                />
                {fieldErrors.dispatcherNotes && (
                  <p className={errorTextClass}>
                    {fieldErrors.dispatcherNotes}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3 pb-10">
            <button
              type="button"
              onClick={() => router.back()}
              className={`px-8 py-3 rounded-xl border ${isDark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-700"}`}
            >
              DISCARD
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-8 py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: selectedColor }}
            >
              {isCreateMode ? "COMMIT ASSIGNMENT" : "UPDATE ASSIGNMENT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditAssignment;
