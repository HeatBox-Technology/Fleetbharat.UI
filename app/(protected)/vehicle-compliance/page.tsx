"use client";

import {
  AlertCircle,
  Building2,
  CalendarClock,
  Car,
  CheckCircle2,
  FileBadge2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import { MetricCard } from "@/components/CommonCard";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useTheme } from "@/context/ThemeContext";
import type {
  AccountOption,
  ComplianceFilters,
  ComplianceItem,
  ComplianceSummary,
  VehicleOption,
} from "@/interfaces/vehicleCompliance.interface";
import {
  COMPLIANCE_TYPES,
  STATUS_OPTIONS,
} from "@/interfaces/vehicleCompliance.interface";
import { getAllAccounts } from "@/services/commonServie";
import {
  deleteCompliance,
  getComplianceList,
} from "@/services/vehicleComplianceService";
import { getVehicles } from "@/services/vehicleService";

const formatShortDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
};

const getComplianceStatusStyles = (status?: string) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "healthy") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "duesoon") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized === "overdue") {
    return "border border-red-200 bg-red-50 text-red-700";
  }
  return "border border-slate-200 bg-slate-50 text-slate-700";
};

export default function VehicleCompliancePage() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [records, setRecords] = useState<ComplianceItem[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary>({
    totalDocuments: 0,
    healthy: 0,
    dueSoon: 0,
    overdue: 0,
  });
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<ComplianceFilters>({});
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<ComplianceItem | null>(
    null,
  );

  const columns = useMemo(
    () => [
      {
        key: "vehicle",
        label: "VEHICLE",
        visible: true,
        type: "multi-line" as const,
        mainStyle: "text-sm font-semibold text-violet-600",
        subStyle:
          "text-xs font-medium text-slate-500 normal-case tracking-normal",
      },
      {
        key: "type",
        label: "TYPE",
        visible: true,
        render: (_: unknown, row: ComplianceItem) => (
          <span className="inline-flex rounded-xl border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">
            {row.complianceType}
          </span>
        ),
      },
      {
        key: "documentNumber",
        label: "DOC NUMBER",
        visible: true,
        render: (value: string) => (
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <FileText className="h-4 w-4 text-slate-500" />
            <span>{value}</span>
          </div>
        ),
      },
      {
        key: "expiry",
        label: "EXPIRY DATE",
        visible: true,
        type: "multi-line" as const,
        mainStyle: "text-sm font-semibold text-slate-900",
        subStyle:
          "text-xs font-medium text-slate-500 normal-case tracking-normal",
      },
      {
        key: "status",
        label: "STATUS",
        visible: true,
        render: (value: string) => (
          <span
            className={`inline-flex rounded-xl px-3 py-1 text-xs font-semibold ${getComplianceStatusStyles(
              value,
            )}`}
          >
            {value === "DueSoon" ? "Due Soon" : value}
          </span>
        ),
      },
    ],
    [],
  );

  const selectedAccountOption =
    accounts.find(
      (option) => option.value === Number(filters.accountId || 0),
    ) || null;
  const selectedVehicleOption =
    vehicles.find(
      (option) => option.value === Number(filters.vehicleId || 0),
    ) || null;
  const selectedComplianceType =
    COMPLIANCE_TYPES.find(
      (option) => option.value === String(filters.complianceType || ""),
    ) || null;
  const selectedStatus =
    STATUS_OPTIONS.find(
      (option) => option.value === String(filters.status || ""),
    ) || null;

  const tableRows = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        vehicle: {
          main: record.vehicleNumber,
          sub: record.accountName,
        },
        expiry: {
          main: formatShortDate(record.expiryDate),
          sub: `Issued: ${formatShortDate(record.issueDate)}`,
        },
        type: record.complianceType,
      })),
    [records],
  );

  const loadAccounts = useCallback(async () => {
    try {
      setFilterLoading(true);
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
    } catch (_error) {
      toast.error("Failed to load organizations.");
    } finally {
      setFilterLoading(false);
    }
  }, []);

  const loadVehicles = useCallback(async (accountId?: number) => {
    if (!accountId) {
      setVehicles([]);
      return;
    }

    try {
      setFilterLoading(true);
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
    } catch (_error) {
      toast.error("Failed to load vehicles.");
    } finally {
      setFilterLoading(false);
    }
  }, []);

  const loadComplianceRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getComplianceList(pageNo, pageSize, {
        ...filters,
        search: debouncedQuery || undefined,
      });

      if (!response?.success && Number(response?.statusCode) !== 200) {
        toast.error(response?.message || "Failed to load compliance records.");
        setRecords([]);
        setTotalRecords(0);
        setSummary({
          totalDocuments: 0,
          healthy: 0,
          dueSoon: 0,
          overdue: 0,
        });
        return;
      }

      const items = Array.isArray(response?.data?.documents?.items)
        ? response.data.documents.items
        : [];
      setRecords(items);
      setTotalRecords(Number(response?.data?.documents?.totalRecords || 0));
      setSummary({
        totalDocuments: Number(response?.data?.summary?.totalDocuments || 0),
        healthy: Number(response?.data?.summary?.healthy || 0),
        dueSoon: Number(response?.data?.summary?.dueSoon || 0),
        overdue: Number(response?.data?.summary?.overdue || 0),
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filters, pageNo, pageSize]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (filters.accountId) {
      void loadVehicles(Number(filters.accountId));
    } else {
      setVehicles([]);
    }
  }, [filters.accountId, loadVehicles]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageNo(1);
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    void loadComplianceRecords();
  }, [loadComplianceRecords]);

  const handleDelete = (row: ComplianceItem) => {
    setRecordToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    const response = await deleteCompliance(recordToDelete.id);
    if (response?.success || Number(response?.statusCode) === 200) {
      toast.success(response?.message || "Compliance deleted successfully.");
      if (pageNo > 1 && records.length === 1) {
        setPageNo((prev) => prev - 1);
      } else {
        void loadComplianceRecords();
      }
    } else {
      toast.error(response?.message || "Failed to delete compliance.");
    }
    setRecordToDelete(null);
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div
        className={`min-h-screen p-3 sm:p-4 md:p-6 ${isDark ? "bg-background" : ""}`}
      >
        <PageHeader
          title="Vehicle Compliance"
          subtitle="Manage and track vehicle documents, insurance, and permits in a centralized table."
          breadcrumbs={[{ label: "Fleet" }, { label: "Vehicle Compliance" }]}
          showButton={true}
          buttonText="Add Compliance"
          buttonRoute="/vehicle-compliance/0"
          showExportButton={false}
          showFilterButton={false}
          showBulkUpload={false}
        />

        <div
          className={`mb-6 rounded-2xl border p-4 shadow-sm ${
            isDark ? "border-gray-800 bg-card" : "border-gray-200 bg-white"
          }`}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <Building2 className="h-3.5 w-3.5" />
                Organization
              </p>
              <SearchableDropdown
                options={accounts}
                value={selectedAccountOption}
                onChange={(option) => {
                  setPageNo(1);
                  setFilters((prev) => ({
                    ...prev,
                    accountId: Number(option?.value || 0) || undefined,
                    vehicleId: undefined,
                  }));
                }}
                placeholder="All Organizations"
                isDark={isDark}
                isLoading={filterLoading}
              />
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <Car className="h-3.5 w-3.5" />
                Vehicle Plate
              </p>
              <SearchableDropdown
                options={vehicles}
                value={selectedVehicleOption}
                onChange={(option) => {
                  setPageNo(1);
                  setFilters((prev) => ({
                    ...prev,
                    vehicleId: Number(option?.value || 0) || undefined,
                  }));
                }}
                placeholder="All Vehicles"
                isDark={isDark}
                isDisabled={!filters.accountId}
                isLoading={filterLoading}
              />
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Compliance Type
              </p>
              <SearchableDropdown
                options={COMPLIANCE_TYPES}
                value={selectedComplianceType}
                onChange={(option) => {
                  setPageNo(1);
                  setFilters((prev) => ({
                    ...prev,
                    complianceType: String(option?.value || "") || undefined,
                  }));
                }}
                placeholder="All Types"
                isDark={isDark}
              />
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <AlertCircle className="h-3.5 w-3.5" />
                Status
              </p>
              <SearchableDropdown
                options={STATUS_OPTIONS}
                value={selectedStatus}
                onChange={(option) => {
                  setPageNo(1);
                  setFilters((prev) => ({
                    ...prev,
                    status: String(option?.value || "") || undefined,
                  }));
                }}
                placeholder="All Statuses"
                isDark={isDark}
              />
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={FileBadge2}
            label="Total Documents"
            value={summary.totalDocuments}
            iconBgColor="bg-violet-100"
            iconColor="text-violet-600"
            isDark={isDark}
          />
          <MetricCard
            icon={CheckCircle2}
            label="Healthy"
            value={summary.healthy}
            iconBgColor="bg-emerald-100"
            iconColor="text-emerald-600"
            isDark={isDark}
          />
          <MetricCard
            icon={CalendarClock}
            label="Due Soon"
            value={summary.dueSoon}
            iconBgColor="bg-amber-100"
            iconColor="text-amber-600"
            isDark={isDark}
          />
          <MetricCard
            icon={AlertCircle}
            label="Overdue"
            value={summary.overdue}
            iconBgColor="bg-rose-100"
            iconColor="text-rose-600"
            isDark={isDark}
          />
        </div>

        <ActionLoader
          isVisible={loading}
          text="Loading compliance records..."
        />
        <CommonTable
          columns={columns}
          data={tableRows}
          onEdit={(row) => router.push(`/vehicle-compliance/${row.id}`)}
          onDelete={handleDelete}
          showActions={true}
          searchPlaceholder="Search across all fields..."
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          pageNo={pageNo}
          pageSize={pageSize}
          onPageChange={setPageNo}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageNo(1);
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalRecords={totalRecords}
          variant="simple"
        />

        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setRecordToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Compliance"
          message={`Are you sure you want to delete "${recordToDelete?.documentNumber || ""}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
}
