"use client";

import {
  AlertCircle,
  Building2,
  ChevronDown,
  Link2,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import { MetricCard } from "@/components/CommonCard";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import { getAllAccounts, getFormRightForPath } from "@/services/commonServie";
import { deleteDeviceMap, getDeviceMaps } from "@/services/devicemapService";
import {
  clearDeviceMapSyncStatus,
  deleteVehicleMappingFromJava,
  getDeviceMapSyncStatusMap,
  JAVA_SYNC_STATUS,
  syncVehicleMappingToJava,
} from "@/services/deviceMapJavaSyncService";

interface DeviceMapRow {
  id: number;
  accountId: number;
  orgName: string;
  vehicleId: number;
  vehicleNo: string;
  deviceId: number;
  deviceNo: string;
  fk_devicetypeid: number;
  deviceTypeId: number;
  deviceType: string;
  simId: number;
  simNumber: string;
  remarks: string;
  installationDate: string;
  isActive: boolean;
  createdBy: number;
  updatedBy: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  javaSyncStatus: string;
  javaSyncMessage: string;
}

interface AccountOption {
  id: number;
  value: string;
}

const STATIC_COUNTS = {
  totalAssignments: 2,
  active: 2,
  withIssues: 1,
};

const formatStandardDate = (value: string) => {
  if (!value || value.startsWith("0001-01-01")) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const DeviceMap: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.devicemap.list");
  const pageRight = getFormRightForPath("/devicemap");
  const canRead = pageRight ? Boolean(pageRight.canRead) : true;

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [rows, setRows] = useState<DeviceMapRow[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );
  const [summaryCounts, setSummaryCounts] = useState(STATIC_COUNTS);
  const [syncingRowId, setSyncingRowId] = useState<number | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const autoSyncStartedRef = useRef<Set<number>>(new Set());

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<DeviceMapRow | null>(null);

  const columns = useMemo(
    () => [
      { key: "no", label: t("table.no"), visible: true },
      { key: "vehicleNo", label: t("table.vehicle"), visible: true },
      { key: "deviceNo", label: t("table.device"), visible: true },
      { key: "deviceType", label: "DEVICE TYPE", visible: true },
      { key: "fk_devicetypeid", label: "DEVICE TYPE ID", visible: false },
      {
        key: "status",
        label: t("table.status"),
        type: "badge" as const,
        visible: true,
      },
      {
        key: "javaSyncStatus",
        label: "JAVA SYNC",
        visible: true,
        render: (value: string, row: DeviceMapRow) => {
          const normalizedStatus = String(value || JAVA_SYNC_STATUS.UNSYNCED);
          const isSynced = normalizedStatus === JAVA_SYNC_STATUS.SYNCED;
          const isSyncing =
            normalizedStatus === JAVA_SYNC_STATUS.SYNCING ||
            syncingRowId === row.id;
          const badgeClasses = isSynced
            ? isDark
              ? "bg-emerald-900/30 text-emerald-300 border border-emerald-800"
              : "bg-white text-emerald-700 border border-emerald-400"
            : normalizedStatus === JAVA_SYNC_STATUS.FAILED
              ? isDark
                ? "bg-rose-900/30 text-rose-300 border border-rose-800"
                : "bg-white text-rose-700 border border-rose-400"
              : normalizedStatus === JAVA_SYNC_STATUS.SYNCING
                ? isDark
                  ? "bg-amber-900/30 text-amber-300 border border-amber-800"
                  : "bg-white text-amber-700 border border-amber-400"
                : isDark
                  ? "bg-gray-800/50 text-gray-300 border border-gray-700"
                  : "bg-white text-gray-700 border border-gray-300";

          return (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md ${badgeClasses}`}
                title={row.javaSyncMessage || normalizedStatus}
              >
                {normalizedStatus}
              </span>
              {!isSynced && (
                <button
                  type="button"
                  onClick={() => {
                    void handleSyncRow(row);
                  }}
                  disabled={isSyncing || syncingAll}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    isDark
                      ? "border-gray-700 text-gray-200 hover:bg-gray-800"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing" : "Sync"}
                </button>
              )}
            </div>
          );
        },
      },
      {
        key: "createdAt",
        label: "CREATED AT",
        visible: true,
        render: (value: string) => formatStandardDate(value),
      },
      {
        key: "updatedAt",
        label: "UPDATED AT",
        visible: true,
        render: (value: string) => formatStandardDate(value),
      },
    ],
    [isDark, syncingAll, syncingRowId, t],
  );

  const normalizeStatus = (item: any): string => {
    if (typeof item?.status === "string" && item.status.trim()) {
      const status = item.status.trim().toLowerCase();
      if (status === "active") return t("status.active");
      if (status === "inactive") return t("status.inactive");
      return item.status;
    }

    if (typeof item?.isActive === "boolean") {
      return item.isActive ? t("status.active") : t("status.inactive");
    }

    return t("status.active");
  };

  const firstDefined = (...values: any[]) =>
    values.find((value) => {
      if (value === undefined || value === null) return false;
      const normalized = String(value).trim().toLowerCase();
      return normalized !== "" && normalized !== "undefined" && normalized !== "null";
    });

  const mapRow = (item: any): DeviceMapRow => ({
    id: Number(
      firstDefined(item?.id, item?.vehicleDeviceMapId, item?.mapId, item?.Id, 0),
    ),
    accountId: Number(
      firstDefined(item?.accountId, item?.AccountId, selectedAccountId, 0),
    ),
    orgName: String(
      firstDefined(
        item?.orgName,
        item?.OrgName,
        item?.accountName,
        item?.AccountName,
        item?.account,
        item?.Account,
        "",
      ),
    ),
    vehicleId: Number(
      firstDefined(item?.vehicleId, item?.VehicleId, item?.fk_VehicleId, 0),
    ),
    vehicleNo: String(
      firstDefined(
        item?.vehicleNo,
        item?.VehicleNo,
        item?.vehicleNumber,
        item?.VehicleNumber,
        item?.registrationNo,
        item?.RegistrationNo,
        "-",
      ),
    ),
    deviceId: Number(
      firstDefined(item?.deviceId, item?.DeviceId, item?.fk_DeviceId, 0),
    ),
    deviceNo: String(
      firstDefined(
        item?.deviceNo,
        item?.DeviceNo,
        item?.deviceNumber,
        item?.DeviceNumber,
        item?.imei,
        item?.Imei,
        "-",
      ),
    ),
    fk_devicetypeid: Number(
      firstDefined(
        item?.fk_devicetypeid,
        item?.fk_DeviceTypeId,
        item?.deviceTypeId,
        item?.DeviceTypeId,
        0,
      ),
    ),
    deviceTypeId: Number(
      firstDefined(
        item?.deviceTypeId,
        item?.DeviceTypeId,
        item?.fk_devicetypeid,
        item?.fk_DeviceTypeId,
        0,
      ),
    ),
    deviceType: String(
      firstDefined(
        item?.deviceType,
        item?.DeviceType,
        item?.deviceTypeName,
        item?.DeviceTypeName,
        item?.deviceTypeLabel,
        item?.DeviceTypeLabel,
        item?.deviceCategory,
        item?.DeviceCategory,
        "",
      ),
    ),
    simId: Number(firstDefined(item?.simId, item?.SimId, item?.fk_simid, 0)),
    simNumber: String(
      firstDefined(item?.simNumber, item?.SimNumber, item?.simnno, ""),
    ),
    remarks: String(item?.remarks ?? ""),
    installationDate: String(item?.installationDate ?? ""),
    isActive:
      typeof item?.isActive === "boolean"
        ? item.isActive
        : normalizeStatus(item).toLowerCase() === t("status.active").toLowerCase(),
    createdBy: Number(firstDefined(item?.createdBy, item?.CreatedBy, 0)),
    updatedBy: Number(firstDefined(item?.updatedBy, item?.UpdatedBy, 0)),
    status: normalizeStatus(item),
    createdAt: String(
      firstDefined(
        item?.createdAt,
        item?.CreatedAt,
        item?.createdDatetime,
        item?.CreatedDatetime,
        item?.createdDate,
        item?.CreatedDate,
        item?.assignedAt,
        item?.AssignedAt,
        item?.createdOn,
        item?.CreatedOn,
        "",
      ),
    ),
    updatedAt: String(
      firstDefined(
        item?.updatedAt,
        item?.UpdatedAt,
        item?.updatedDatetime,
        item?.UpdatedDatetime,
        item?.updatedDate,
        item?.UpdatedDate,
        item?.modifiedAt,
        item?.ModifiedAt,
        item?.updatedOn,
        item?.UpdatedOn,
        "",
      ),
    ),
    javaSyncStatus: String(
      getDeviceMapSyncStatusMap()?.[
        String(Number(item?.id ?? item?.vehicleDeviceMapId ?? item?.mapId ?? 0))
      ]?.status ?? JAVA_SYNC_STATUS.UNSYNCED,
    ),
    javaSyncMessage: String(
      getDeviceMapSyncStatusMap()?.[
        String(Number(item?.id ?? item?.vehicleDeviceMapId ?? item?.mapId ?? 0))
      ]?.message ?? "",
    ),
  });

  const getListData = (response: any): any[] => {
    if (Array.isArray(response?.data?.assignments?.items)) {
      return response.data.assignments.items;
    }

    if (Array.isArray(response?.data?.pageData?.items)) {
      return response.data.pageData.items;
    }

    if (Array.isArray(response?.data?.items)) {
      return response.data.items;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  };

  const getTotalRecords = (response: any, fallbackLength: number): number =>
    Number(
      response?.data?.assignments?.totalRecords ??
        response?.data?.pageData?.totalRecords ??
        response?.data?.totalRecords ??
        fallbackLength,
    );

  const getSummaryCounts = (response: any) => {
    const summary = response?.data?.summary;
    if (summary && typeof summary === "object") {
      return {
        totalAssignments: Number(
          summary.totalAssignments ?? STATIC_COUNTS.totalAssignments,
        ),
        active: Number(summary.active ?? STATIC_COUNTS.active),
        withIssues: Number(summary.withIssues ?? STATIC_COUNTS.withIssues),
      };
    }
    return STATIC_COUNTS;
  };

  const getAccountIdFromStorage = (): number => {
    if (typeof window === "undefined") return 0;

    try {
      const selectedAccountId = Number(localStorage.getItem("accountId") || 0);
      if (selectedAccountId > 0) return selectedAccountId;

      const userString = localStorage.getItem("user");
      if (!userString) return 0;
      const user = JSON.parse(userString);
      const accountId = Number(user?.accountId || 0);
      return Number.isNaN(accountId) ? 0 : accountId;
    } catch (error) {
      console.error("Failed to parse user from localStorage:", error);
      return 0;
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await getAllAccounts();
      if (response?.statusCode === 200 && Array.isArray(response?.data)) {
        setAccounts(response.data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchDeviceMaps = async () => {
    if (!selectedAccountId || selectedAccountId <= 0) {
      setRows([]);
      setTotalRecords(0);
      setSummaryCounts({
        totalAssignments: 0,
        active: 0,
        withIssues: 0,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const nextSyncStatusMap = getDeviceMapSyncStatusMap();
      const requestParams = {
        page: pageNo,
        pageSize,
        accountId: selectedAccountId,
        search: debouncedQuery,
      } as any;
      const response = await getDeviceMaps(requestParams);

      const items = getListData(response);
      setRows(
        items.map((item: any) => {
          const row = mapRow(item);
          const savedStatus = nextSyncStatusMap[String(row.id)];
          return {
            ...row,
            javaSyncStatus: String(
              savedStatus?.status ?? row.javaSyncStatus ?? JAVA_SYNC_STATUS.UNSYNCED,
            ),
            javaSyncMessage: String(savedStatus?.message ?? row.javaSyncMessage ?? ""),
          };
        }),
      );
      setTotalRecords(getTotalRecords(response, items.length));
      setSummaryCounts(getSummaryCounts(response));
    } catch (error) {
      console.error("Error fetching device maps:", error);
      toast.error(t("toast.fetchFailed"));
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    const storageAccountId = getAccountIdFromStorage();
    setSelectedAccountId(storageAccountId);
    fetchAccounts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!selectedAccountId || selectedAccountId <= 0) return;
    fetchDeviceMaps();
  }, [pageNo, pageSize, debouncedQuery, selectedAccountId]);

  useEffect(() => {
    const nextRow = rows.find(
      (row) =>
        row.id > 0 &&
        row.javaSyncStatus !== JAVA_SYNC_STATUS.SYNCED &&
        !autoSyncStartedRef.current.has(row.id),
    );

    if (!nextRow || syncingAll || syncingRowId !== null) {
      return;
    }

    autoSyncStartedRef.current.add(nextRow.id);
    void handleSyncRow(nextRow, { silent: true });
  }, [rows, syncingAll, syncingRowId]);

  const refreshSyncStatuses = () => {
    const nextSyncStatusMap = getDeviceMapSyncStatusMap();
    setRows((prevRows) =>
      prevRows.map((row) => {
        const syncEntry = nextSyncStatusMap[String(row.id)];
        return {
          ...row,
          javaSyncStatus: String(
            syncEntry?.status ?? row.javaSyncStatus ?? JAVA_SYNC_STATUS.UNSYNCED,
          ),
          javaSyncMessage: String(syncEntry?.message ?? row.javaSyncMessage ?? ""),
        };
      }),
    );
  };

  const applyRowSyncStatus = (
    mappingId: number,
    status: string,
    message = "",
  ) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === mappingId
          ? {
              ...row,
              javaSyncStatus: status,
              javaSyncMessage: message || row.javaSyncMessage,
            }
          : row,
      ),
    );
  };

  const handleSyncRow = async (
    row: DeviceMapRow,
    options: { silent?: boolean } = {},
  ) => {
    const { silent = false } = options;
    try {
      setSyncingRowId(row.id);
      const result = await syncVehicleMappingToJava({
        mappingId: row.id,
        accountId: row.accountId,
        orgName: row.orgName,
        vehicleId: row.vehicleId,
        vehicleNo: row.vehicleNo,
        deviceId: row.deviceId,
        deviceNo: row.deviceNo,
        fk_devicetypeid: row.fk_devicetypeid,
        deviceTypeId: row.deviceTypeId || row.fk_devicetypeid,
        deviceType: row.deviceType,
        imei: row.deviceNo,
        simId: row.simId,
        simNumber: row.simNumber,
        installationDate: row.installationDate,
        remarks: row.remarks,
        isActive: row.isActive,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
      });
      if (result.success) {
        applyRowSyncStatus(
          row.id,
          JAVA_SYNC_STATUS.SYNCED,
          result?.data?.message || "Synced to Java",
        );
        refreshSyncStatuses();
        if (!silent) {
          toast.success(`Java sync completed for ${row.vehicleNo}`);
        }
      } else {
        applyRowSyncStatus(
          row.id,
          JAVA_SYNC_STATUS.FAILED,
          result?.data?.message || `Java sync failed for ${row.vehicleNo}`,
        );
        refreshSyncStatuses();
        if (!silent) {
          toast.error(
            result?.data?.message || `Java sync failed for ${row.vehicleNo}`,
          );
        }
      }
    } catch (error: any) {
      console.error("Error syncing device map to Java:", error);
      refreshSyncStatuses();
      if (!silent) {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            `Java sync failed for ${row.vehicleNo}`,
        );
      }
    } finally {
      setSyncingRowId(null);
    }
  };

  const handleSyncAllUnsynced = async () => {
    const rowsToSync = rows.filter(
      (row) => row.javaSyncStatus !== JAVA_SYNC_STATUS.SYNCED,
    );

    if (rowsToSync.length === 0) {
      toast.info("All visible rows are already synced to Java");
      return;
    }

    try {
      setSyncingAll(true);
      let successCount = 0;
      let failureCount = 0;
      for (const row of rowsToSync) {
        try {
          const result = await syncVehicleMappingToJava({
            mappingId: row.id,
            accountId: row.accountId,
            orgName: row.orgName,
            vehicleId: row.vehicleId,
            vehicleNo: row.vehicleNo,
            deviceId: row.deviceId,
            deviceNo: row.deviceNo,
            fk_devicetypeid: row.fk_devicetypeid,
            deviceTypeId: row.deviceTypeId || row.fk_devicetypeid,
            deviceType: row.deviceType,
            imei: row.deviceNo,
            simId: row.simId,
            simNumber: row.simNumber,
            installationDate: row.installationDate,
            remarks: row.remarks,
            isActive: row.isActive,
            createdBy: row.createdBy,
            updatedBy: row.updatedBy,
          });
          if (result.success) {
            applyRowSyncStatus(
              row.id,
              JAVA_SYNC_STATUS.SYNCED,
              result?.data?.message || "Synced to Java",
            );
            successCount += 1;
          } else {
            applyRowSyncStatus(
              row.id,
              JAVA_SYNC_STATUS.FAILED,
              result?.data?.message || `Java sync failed for ${row.vehicleNo}`,
            );
            failureCount += 1;
          }
        } catch (error) {
          failureCount += 1;
          console.error(`Bulk Java sync failed for mapping ${row.id}:`, error);
        }
      }
      refreshSyncStatuses();
      if (failureCount === 0) {
        toast.success(`Java sync completed for ${successCount} row(s)`);
      } else {
        toast.warning(
          `Java sync finished with ${successCount} success and ${failureCount} failure`,
        );
      }
    } finally {
      setSyncingAll(false);
    }
  };

  useEffect(() => {
    const handleBulkUploadCompleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ moduleKey?: string }>;
      if (customEvent.detail?.moduleKey !== "devicemap") return;

      void (async () => {
        await fetchDeviceMaps();
        setTimeout(() => {
          void handleSyncAllUnsynced();
        }, 1200);
      })();
    };

    window.addEventListener(
      "bulk-upload-completed",
      handleBulkUploadCompleted as EventListener,
    );

    return () => {
      window.removeEventListener(
        "bulk-upload-completed",
        handleBulkUploadCompleted as EventListener,
      );
    };
  }, [debouncedQuery, pageNo, pageSize, rows, selectedAccountId]);

  const handleEdit = (row: DeviceMapRow) => {
    router.push(`/devicemap/${row.id}`);
  };

  const handleDelete = (row: DeviceMapRow) => {
    setSelectedRow(row);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRow) return;

    try {
      const javaDeleteResult = await deleteVehicleMappingFromJava({
        mappingId: selectedRow.id,
        accountId: selectedRow.accountId,
        orgName: selectedRow.orgName,
        vehicleId: selectedRow.vehicleId,
        vehicleNo: selectedRow.vehicleNo,
        deviceId: selectedRow.deviceId,
        deviceNo: selectedRow.deviceNo,
        fk_devicetypeid: selectedRow.fk_devicetypeid,
        deviceTypeId: selectedRow.deviceTypeId || selectedRow.fk_devicetypeid,
        deviceType: selectedRow.deviceType,
        imei: selectedRow.deviceNo,
        simId: selectedRow.simId,
        simNumber: selectedRow.simNumber,
        installationDate: selectedRow.installationDate,
        remarks: selectedRow.remarks,
        isActive: selectedRow.isActive,
        createdBy: selectedRow.createdBy,
        updatedBy: selectedRow.updatedBy,
      });

      if (!javaDeleteResult.success) {
        toast.error(
          javaDeleteResult?.data?.message ||
            "Java delete failed. Local delete was not attempted.",
        );
        return;
      }

      const response = await deleteDeviceMap(selectedRow.id);
      if (response?.success || [200, 204].includes(response?.statusCode)) {
        clearDeviceMapSyncStatus(selectedRow.id);
        refreshSyncStatuses();
        toast.success(response?.message || t("toast.deleted"));
        void fetchDeviceMaps();
      } else {
        toast.error(
          response?.message ||
            "Deleted in Java, but local delete failed. Please retry local cleanup.",
        );
      }
    } catch (error) {
      console.error("Error deleting device map:", error);
      toast.error(t("toast.deleteError"));
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedRow(null);
    }
  };

  if (!canRead) {
    return (
      <div className={`${isDark ? "dark" : ""} mt-10`}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-foreground">{t("noReadPermission")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader isVisible={loading} text="Loading device assignments..." />
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-2 sm:p-0 md:p-2`}
      >
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.fleet") },
            { label: t("breadcrumbs.current") },
          ]}
          showButton={true}
          buttonText={t("addButton")}
          buttonIcon={<Plus className="w-4 h-4" />}
          buttonRoute="/devicemap/0"
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-6">
          <div className="relative w-full sm:w-auto sm:min-w-[220px]">
            <Building2
              className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-gray-300" : "text-gray-500"}`}
            />
            <select
              value={selectedAccountId ?? ""}
              onChange={(e) => {
                const nextAccountId = Number(e.target.value);
                setSelectedAccountId(nextAccountId);
                localStorage.setItem("accountId", String(nextAccountId));
                setPageNo(1);
              }}
              className={`w-full appearance-none pl-10 pr-10 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                isDark
                  ? "bg-card border-gray-700 text-foreground"
                  : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              {accounts.length === 0 && (
                <option value={selectedAccountId ?? ""}>{t("allAccounts")}</option>
              )}
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.value}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? "text-gray-300" : "text-gray-500"}`}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              void handleSyncAllUnsynced();
            }}
            disabled={syncingAll || loading || rows.length === 0}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isDark
                ? "border-gray-700 text-gray-200 hover:bg-gray-800"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${syncingAll ? "animate-spin" : ""}`} />
            {syncingAll ? "Syncing..." : "Sync All Unsynced"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <MetricCard
            icon={Link2}
            label={t("metrics.totalAssignments")}
            value={summaryCounts.totalAssignments}
            iconBgColor="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            isDark={isDark}
          />
          <MetricCard
            icon={ShieldCheck}
            label={t("metrics.active")}
            value={summaryCounts.active}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            isDark={isDark}
          />
          <MetricCard
            icon={AlertCircle}
            label={t("metrics.withIssues")}
            value={summaryCounts.withIssues}
            iconBgColor="bg-orange-100 dark:bg-orange-900/30"
            iconColor="text-orange-600 dark:text-orange-400"
            isDark={isDark}
          />
        </div>

        <CommonTable
          columns={columns}
          data={rows}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showActions={true}
          searchPlaceholder={t("searchPlaceholder")}
          rowsPerPageOptions={[10, 25, 50, 100]}
          defaultRowsPerPage={10}
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
        />

        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSelectedRow(null);
          }}
          onConfirm={confirmDelete}
          title={t("deleteTitle")}
          message={t("deleteMessage", { name: selectedRow?.vehicleNo || "" })}
          confirmText={t("confirmDelete")}
          cancelText={t("cancel")}
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default DeviceMap;
