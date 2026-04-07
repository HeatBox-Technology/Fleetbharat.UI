"use client";

import {
  AlertCircle,
  Building2,
  ChevronDown,
  ShieldCheck,
  Smartphone,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import { MetricCard } from "@/components/CommonCard";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import type { SimItem, SimSummary } from "@/interfaces/sim.interface";
import { getAllAccounts } from "@/services/commonServie";
import { deleteSim, exportSims, getSims } from "@/services/simservice";

interface AccountOption {
  id: number;
  value: string;
}

type SimApiItem = {
  simId?: number;
  iccid?: string;
  msisdn?: string;
  imsi?: string;
  networkProviderId?: number | string;
  statusKey?: string;
  status?: string;
  statusLabel?: string;
  isDeleted?: boolean;
  isActive?: boolean;
  expiryAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

// ── Component ──────────────────────────────────────────────────────────────
const SimMaster: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.simMaster.list");
  const tDetail = useTranslations("pages.simMaster.detail");

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );
  const [data, setData] = useState<SimItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [summaryData, setSummaryData] = useState<SimSummary>({
    totalSims: 0,
    enabled: 0,
    disabled: 0,
    activeCarriers: 0,
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [simToDelete, setSimToDelete] = useState<SimItem | null>(null);
  const [isSimsLoading, setIsSimsLoading] = useState(false);

  const getUserAccountIdFromStorage = useCallback(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return Number(user?.accountId || 0);
    } catch (error) {
      console.error("Failed to parse user account:", error);
      return 0;
    }
  }, []);

  const columns = [
    {
      key: "iccid",
      label: t("table.iccid"),
      visible: true,
      render: (value: string, row: SimItem) => (
        <div>
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            {value}
          </span>
          <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide font-medium">
            {row.carrier}
          </p>
        </div>
      ),
    },
    {
      key: "msisdn",
      label: t("table.msisdn"),
      visible: true,
    },
    {
      key: "status",
      label: t("table.status"),
      visible: true,
      type: "badge" as const,
    },
    {
      key: "contractExpiry",
      label: t("table.contractExpiry"),
      visible: true,
      type: "date" as const,
    },
    {
      key: "updatedAt",
      label: t("table.lastUpdated"),
      visible: true,
      type: "date" as const,
    },
  ];

  const normalizeSimStatus = useCallback((sim: SimApiItem): string => {
    if (sim?.isDeleted) {
      return "inactive";
    }

    if (typeof sim?.isActive === "boolean") {
      return sim.isActive ? "active" : "inactive";
    }

    const rawStatus = String(
      sim?.statusKey ?? sim?.status ?? sim?.statusLabel ?? "",
    )
      .trim()
      .toLowerCase();

    if (["inactive", "disabled", "expired"].includes(rawStatus)) {
      return "inactive";
    }

    if (["active", "enabled"].includes(rawStatus)) {
      return "active";
    }

    return "active";
  }, []);

  const fetchSims = useCallback(async () => {
    if (!selectedAccountId || selectedAccountId <= 0) {
      setData([]);
      setTotalRecords(0);
      setSummaryData({
        totalSims: 0,
        enabled: 0,
        disabled: 0,
        activeCarriers: 0,
      });
      setIsSimsLoading(false);
      return;
    }

    try {
      setIsSimsLoading(true);
      const response = await getSims(
        pageNo,
        pageSize,
        debouncedQuery,
        selectedAccountId,
      );
      console.log("sim response", response);

      const simsData = response.data?.sims;
      const summary = response.data?.summary;
      const items = (
        Array.isArray(simsData?.items) ? simsData.items : []
      ) as SimApiItem[];

      if (items.length) {
        const mappedData = items.map((sim) => ({
          simId: sim.simId,
          iccid: sim.iccid,
          msisdn: sim.msisdn || "",
          imsiCode: sim.imsi || "",
          carrier: sim.networkProviderId || "",
          status: normalizeSimStatus(sim),
          contractExpiry: sim.expiryAt || null,
          updatedAt: sim.updatedAt || sim.createdAt || null,
        }));

        const derivedEnabled = mappedData.filter(
          (item) => String(item.status || "").toLowerCase() === "active",
        ).length;
        const derivedDisabled = mappedData.filter(
          (item) => String(item.status || "").toLowerCase() === "inactive",
        ).length;

        setSummaryData({
          totalSims: Number(
            summary?.totalSims || simsData?.totalRecords || items.length || 0,
          ),
          enabled: Number(summary?.active || derivedEnabled || 0),
          disabled: Number(summary?.inactive || derivedDisabled || 0),
          activeCarriers: Number(
            summary?.activeCarriers || summary?.active || 0,
          ),
        });

        setData(mappedData);
        setTotalRecords(Number(simsData?.totalRecords || items.length || 0));
      } else {
        setData([]);
        setTotalRecords(Number(simsData?.totalRecords || 0));
        setSummaryData({
          totalSims: Number(summary?.totalSims || simsData?.totalRecords || 0),
          enabled: Number(summary?.active || 0),
          disabled: Number(summary?.inactive || 0),
          activeCarriers: Number(
            summary?.activeCarriers || summary?.active || 0,
          ),
        });
      }
    } catch (error) {
      console.error("Error fetching SIMs:", error);
      toast.error(t("toast.loadError"));
    } finally {
      setIsSimsLoading(false);
    }
  }, [
    debouncedQuery,
    normalizeSimStatus,
    pageNo,
    pageSize,
    selectedAccountId,
    t,
  ]);

  const handleExport = async () => {
    if (!selectedAccountId || selectedAccountId <= 0) {
      toast.error(t("toast.exportFailed"));
      return;
    }

    try {
      const response = await exportSims(selectedAccountId, searchQuery);
      if (response?.success || Number(response?.statusCode) === 200) {
        toast.success(t("toast.exportSuccess"));
      } else {
        toast.error(response?.message || t("toast.exportFailed"));
      }
    } catch {
      toast.error(t("toast.exportFailed"));
    }
  };

  useEffect(() => {
    const initAccounts = async () => {
      try {
        const userAccountId = getUserAccountIdFromStorage();
        setSelectedAccountId(userAccountId > 0 ? userAccountId : 0);

        const response = await getAllAccounts();
        if (response?.statusCode === 200 && Array.isArray(response?.data)) {
          setAccounts(response.data);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };

    initAccounts();
  }, [getUserAccountIdFromStorage]);

  useEffect(() => {
    if (!selectedAccountId || selectedAccountId <= 0) return;
    void fetchSims();
  }, [fetchSims, selectedAccountId]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleEdit = (row: SimItem) => {
    router.push(`/sim-master/${row.simId}`);
  };

  const handleDelete = (row: SimItem) => {
    setSimToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!simToDelete) return;
    try {
      const response = await deleteSim(simToDelete.simId);
      if (
        response?.success ||
        [200, 202, 204].includes(Number(response?.statusCode || 0))
      ) {
        toast.success(response.message || t("toast.removed"));
        fetchSims();
      } else {
        toast.error(response?.message || t("toast.deleteFailed"));
      }
    } catch (error) {
      console.error("Error deleting SIM:", error);
      toast.error(t("toast.deleteError"));
    } finally {
      setSimToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader isVisible={isSimsLoading} text="Loading SIMs..." />
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-2`}>
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.fleet") },
            { label: t("breadcrumbs.current") },
          ]}
          showButton={true}
          buttonText={t("addButton")}
          buttonRoute="/sim-master/0"
          showExportButton={true}
          ExportbuttonText={t("export")}
          onExportClick={handleExport}
          showFilterButton={false}
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-6">
          <div className="relative w-full sm:w-auto sm:min-w-[220px]">
            <Building2
              className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? "text-gray-300" : "text-gray-500"
              }`}
            />
            <select
              value={selectedAccountId ?? ""}
              onChange={(e) => {
                const nextAccountId = Number(e.target.value);
                setSelectedAccountId(nextAccountId);
                setPageNo(1);
              }}
              className={`w-full appearance-none pl-10 pr-10 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                isDark
                  ? "bg-card border-gray-700 text-foreground"
                  : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              {accounts.length === 0 && (
                <option value={selectedAccountId ?? ""}>
                  {tDetail("fields.selectAccount")}
                </option>
              )}
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.value}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                isDark ? "text-gray-300" : "text-gray-500"
              }`}
            />
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={Smartphone}
            label={t("metrics.totalSims")}
            value={summaryData.totalSims}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
            isDark={isDark}
          />
          <MetricCard
            icon={ShieldCheck}
            label={t("metrics.enabled")}
            value={summaryData.enabled}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
            isDark={isDark}
          />
          <MetricCard
            icon={AlertCircle}
            label={t("metrics.disabled")}
            value={summaryData.disabled}
            iconBgColor="bg-orange-100"
            iconColor="text-orange-600"
            isDark={isDark}
          />
          <MetricCard
            icon={Wifi}
            label={t("metrics.activeCarriers")}
            value={summaryData.activeCarriers}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
            isDark={isDark}
          />
        </div>

        {/* Table */}
        <CommonTable
          columns={columns}
          data={data}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showActions={true}
          searchPlaceholder={t("searchPlaceholder")}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          defaultRowsPerPage={10}
          pageNo={pageNo}
          pageSize={pageSize}
          onPageChange={(page) => setPageNo(page)}
          totalRecords={totalRecords}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageNo(1);
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSimToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t("delete.title")}
          message={t("delete.message", { iccid: simToDelete?.iccid || "" })}
          confirmText={t("delete.confirm")}
          cancelText={t("delete.cancel")}
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default SimMaster;
