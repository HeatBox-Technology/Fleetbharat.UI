"use client";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Car,
  Clock3,
  FileText,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import { Card } from "@/components/CommonCard";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useTheme } from "@/context/ThemeContext";
import type {
  AccountOption,
  ComplianceCreatePayload,
  ComplianceItem,
  ComplianceUpdatePayload,
  VehicleOption,
} from "@/interfaces/vehicleCompliance.interface";
import { COMPLIANCE_TYPES } from "@/interfaces/vehicleCompliance.interface";
import { getAllAccounts } from "@/services/commonServie";
import {
  createCompliance,
  getComplianceById,
  updateCompliance,
} from "@/services/vehicleComplianceService";
import { getVehicles } from "@/services/vehicleService";
import { getStoredAccountId, getStoredUserId } from "@/utils/storage";

type ComplianceFormState = {
  accountId: number;
  vehicleId: number;
  complianceType: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  reminderBeforeDays: string;
  documentPath: string | null;
  documentFileName: string | null;
  remarks: string;
};

const defaultFormState: ComplianceFormState = {
  accountId: 0,
  vehicleId: 0,
  complianceType: "PUC",
  documentNumber: "",
  issueDate: "",
  expiryDate: "",
  reminderBeforeDays: "7",
  documentPath: null,
  documentFileName: null,
  remarks: "",
};

export default function VehicleComplianceFormPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  const params = useParams();
  const recordId = Number(params.id);
  const isEditMode = recordId > 0;
  const [form, setForm] = useState<ComplianceFormState>(defaultFormState);
  const [file, setFile] = useState<File | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  const selectedAccount =
    accounts.find((option) => option.value === form.accountId) || null;
  const selectedVehicle =
    vehicles.find((option) => option.value === form.vehicleId) || null;
  const selectedComplianceType =
    COMPLIANCE_TYPES.find((option) => option.value === form.complianceType) ||
    null;

  const getDefaultAccountId = useCallback(() => {
    if (typeof window === "undefined") return 0;
    try {
      const selectedAccountId = Number(localStorage.getItem("accountId") || 0);
      if (selectedAccountId > 0) return selectedAccountId;
    } catch {
      // ignore
    }
    return Number(getStoredAccountId() || 0);
  }, []);

  const getActorId = useCallback(
    (accountId?: number) => {
      const storedUserId = Number(getStoredUserId() || 0);
      if (storedUserId > 0) return storedUserId;
      return Number(accountId || getDefaultAccountId() || 0);
    },
    [getDefaultAccountId],
  );

  const loadAccounts = useCallback(async () => {
    const response = await getAllAccounts();
    const items: Array<{
      id?: number | string;
      value?: string;
      name?: string;
    }> = Array.isArray(response?.data) ? response.data : [];
    setAccounts(
      items.map(
        (item: { id?: number | string; value?: string; name?: string }) => ({
          label: String(item?.value || item?.name || "Unknown Organization"),
          value: Number(item?.id || item?.value || 0),
        }),
      ),
    );
  }, []);

  const loadVehicles = useCallback(async (accountId: number) => {
    if (!accountId) {
      setVehicles([]);
      return;
    }

    const response = await getVehicles(1, 100, "", accountId);
    const vehicleBlock =
      response?.data?.data?.vehicles ||
      response?.data?.vehicles ||
      response?.vehicles ||
      response?.data ||
      {};
    const items: Array<{
      id?: number | string;
      vehicleId?: number | string;
      vehicleNumber?: string;
      registrationNumber?: string;
    }> = Array.isArray(vehicleBlock?.items)
      ? vehicleBlock.items
      : Array.isArray(vehicleBlock)
        ? vehicleBlock
        : [];

    setVehicles(
      items.map((item) => ({
        label: String(item?.vehicleNumber || item?.registrationNumber || "-"),
        value: Number(item?.id || item?.vehicleId || 0),
      })),
    );
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setPageLoading(true);
        await loadAccounts();

        if (!isEditMode) {
          const defaultAccountId = getDefaultAccountId();
          if (defaultAccountId > 0) {
            setForm((prev) => ({
              ...prev,
              accountId: prev.accountId || defaultAccountId,
            }));
          }
        }

        if (isEditMode) {
          const response = await getComplianceById(recordId);
          if (!response?.success && Number(response?.statusCode) !== 200) {
            toast.error(
              response?.message || "Failed to load compliance record.",
            );
            return;
          }

          const item: ComplianceItem | null = response?.data || null;
          if (!item) {
            toast.error("Compliance record not found.");
            return;
          }

          const nextForm: ComplianceFormState = {
            accountId: Number(item.accountId || 0),
            vehicleId: Number(item.vehicleId || 0),
            complianceType: item.complianceType || "PUC",
            documentNumber: item.documentNumber || "",
            issueDate: String(item.issueDate || "").split("T")[0] || "",
            expiryDate: String(item.expiryDate || "").split("T")[0] || "",
            reminderBeforeDays: String(Number(item.reminderBeforeDays || 7)),
            documentPath: item.documentPath || null,
            documentFileName: item.documentFileName || null,
            remarks: item.remarks || "",
          };

          setForm(nextForm);
          if (nextForm.accountId) {
            await loadVehicles(nextForm.accountId);
          }
        }
      } catch (_error) {
        toast.error("Failed to prepare compliance form.");
      } finally {
        setPageLoading(false);
      }
    };

    void bootstrap();
  }, [getDefaultAccountId, isEditMode, loadAccounts, loadVehicles, recordId]);

  useEffect(() => {
    if (form.accountId) {
      void loadVehicles(form.accountId);
    } else {
      setVehicles([]);
    }
  }, [form.accountId, loadVehicles]);

  const validate = () => {
    if (!form.accountId) {
      toast.error("Organization is required.");
      return false;
    }
    if (!form.vehicleId) {
      toast.error("Vehicle is required.");
      return false;
    }
    if (!form.complianceType) {
      toast.error("Compliance type is required.");
      return false;
    }
    if (!form.documentNumber.trim()) {
      toast.error("Document / Reference Number is required.");
      return false;
    }
    if (!form.issueDate) {
      toast.error("Issue date is required.");
      return false;
    }
    if (!form.expiryDate) {
      toast.error("Due / Expiry date is required.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const actorId = getActorId(form.accountId);
      const reminderBeforeDays = Math.max(
        1,
        Number.parseInt(form.reminderBeforeDays || "7", 10) || 7,
      );

      if (isEditMode) {
        const payload: ComplianceUpdatePayload = {
          accountId: form.accountId,
          vehicleId: form.vehicleId,
          complianceType: form.complianceType,
          documentNumber: form.documentNumber.trim(),
          issueDate: form.issueDate,
          expiryDate: form.expiryDate,
          reminderBeforeDays,
          documentPath: form.documentPath,
          documentFileName: form.documentFileName,
          remarks: form.remarks.trim() || null,
          updatedBy: actorId,
        };

        const response = await updateCompliance(
          recordId,
          payload,
          file || undefined,
        );
        if (response?.success || Number(response?.statusCode) === 200) {
          toast.success(
            response?.message || "Compliance updated successfully.",
          );
          router.push("/vehicle-compliance");
          return;
        }

        toast.error(response?.message || "Failed to update compliance.");
        return;
      }

      const payload: ComplianceCreatePayload = {
        accountId: form.accountId,
        vehicleId: form.vehicleId,
        complianceType: form.complianceType,
        documentNumber: form.documentNumber.trim(),
        issueDate: form.issueDate,
        expiryDate: form.expiryDate,
        reminderBeforeDays,
        documentPath: null,
        documentFileName: null,
        remarks: form.remarks.trim() || null,
        createdBy: actorId,
      };

      const response = await createCompliance(payload, file || undefined);
      if (response?.success || Number(response?.statusCode) === 200) {
        toast.success(response?.message || "Compliance created successfully.");
        router.push("/vehicle-compliance");
        return;
      }

      toast.error(response?.message || "Failed to create compliance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div
        className={`min-h-screen p-3 sm:p-4 md:p-6 ${isDark ? "bg-background" : ""}`}
      >
        <ActionLoader
          isVisible={pageLoading || loading}
          text={
            pageLoading
              ? "Loading compliance form..."
              : isEditMode
                ? "Updating compliance..."
                : "Creating compliance..."
          }
        />

        <div className="mb-6 flex items-start gap-3">
          <Link
            href="/vehicle-compliance"
            className={`mt-1 rounded-xl p-2 transition ${
              isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1
              className={`text-2xl font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}
            >
              {isEditMode ? "Edit Compliance Entry" : "New Compliance Entry"}
            </h1>
            <p
              className={`${isDark ? "text-gray-400" : "text-gray-500"} text-sm`}
            >
              Add a new document or certificate for your vehicle.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Card isDark={isDark}>
            <div className="border-b border-gray-200 pb-5 dark:border-gray-800">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-violet-600">
                <FileText className="h-4 w-4" />
                Basic Information
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Building2 className="h-4 w-4" />
                  Organization
                </div>
                <SearchableDropdown
                  options={accounts}
                  value={selectedAccount}
                  onChange={(option) =>
                    setForm((prev) => ({
                      ...prev,
                      accountId: Number(option?.value || 0),
                      vehicleId: 0,
                    }))
                  }
                  placeholder="Select Organization"
                  isDark={isDark}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Car className="h-4 w-4" />
                  Vehicle
                </div>
                <SearchableDropdown
                  options={vehicles}
                  value={selectedVehicle}
                  onChange={(option) =>
                    setForm((prev) => ({
                      ...prev,
                      vehicleId: Number(option?.value || 0),
                    }))
                  }
                  placeholder="Select Vehicle"
                  isDark={isDark}
                  isDisabled={!form.accountId}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="h-4 w-4" />
                  Compliance Type
                </div>
                <SearchableDropdown
                  options={COMPLIANCE_TYPES}
                  value={selectedComplianceType}
                  onChange={(option) =>
                    setForm((prev) => ({
                      ...prev,
                      complianceType: String(option?.value || ""),
                    }))
                  }
                  placeholder="Select Compliance Type"
                  isDark={isDark}
                />
              </div>

              <div>
                <label
                  htmlFor="documentNumber"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  <FileText className="h-4 w-4" />
                  Document / Reference Number
                </label>
                <input
                  id="documentNumber"
                  type="text"
                  value={form.documentNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      documentNumber: e.target.value,
                    }))
                  }
                  placeholder="e.g. INS-12345678"
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 ${
                    isDark
                      ? "border-gray-700 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-slate-900"
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="issueDate"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  <CalendarDays className="h-4 w-4" />
                  Issue Date
                </label>
                <input
                  id="issueDate"
                  type="date"
                  value={form.issueDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, issueDate: e.target.value }))
                  }
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 ${
                    isDark
                      ? "border-gray-700 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-slate-900"
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="expiryDate"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  <CalendarDays className="h-4 w-4" />
                  Due / Expiry Date
                </label>
                <input
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, expiryDate: e.target.value }))
                  }
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 ${
                    isDark
                      ? "border-gray-700 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-slate-900"
                  }`}
                />
              </div>
            </div>
          </Card>

          <Card isDark={isDark}>
            <div className="border-b border-gray-200 pb-5 dark:border-gray-800">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
                <Clock3 className="h-4 w-4" />
                Reminders & Attachments
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="reminderBeforeDays"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  <Clock3 className="h-4 w-4" />
                  Reminder Before (Days)
                </label>
                <input
                  id="reminderBeforeDays"
                  type="number"
                  min={1}
                  value={form.reminderBeforeDays}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      reminderBeforeDays: e.target.value,
                    }))
                  }
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 ${
                    isDark
                      ? "border-gray-700 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-slate-900"
                  }`}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Upload className="h-4 w-4" />
                  Upload Document
                </div>
                <label
                  htmlFor="complianceDocument"
                  className={`flex min-h-[52px] cursor-pointer items-center justify-center rounded-xl border border-dashed px-4 py-3 text-sm ${
                    isDark
                      ? "border-gray-700 bg-gray-900 text-gray-300"
                      : "border-gray-300 bg-white text-slate-500"
                  }`}
                >
                  <input
                    id="complianceDocument"
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <span>
                    {file?.name ||
                      form.documentFileName ||
                      "Click or drag to upload..."}
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6">
              <label
                htmlFor="remarks"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Remarks
              </label>
              <textarea
                id="remarks"
                rows={4}
                value={form.remarks}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, remarks: e.target.value }))
                }
                placeholder="Additional notes or details..."
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 ${
                  isDark
                    ? "border-gray-700 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-slate-900"
                }`}
              />
            </div>
          </Card>

          <div
            id="form-footer-actions"
            className="form-footer-actions flex justify-end gap-3"
          >
            <button
              type="button"
              onClick={() => router.push("/vehicle-compliance")}
              className={`rounded-lg px-6 py-3 text-sm font-medium ${
                isDark
                  ? "border border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg bg-violet-600 px-8 py-3 text-sm font-semibold text-white hover:bg-violet-700"
            >
              {isEditMode ? "Update Compliance" : "Create Compliance"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
