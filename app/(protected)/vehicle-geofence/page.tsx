"use client";

import {
  AlertCircle,
  Building2,
  ChevronDown,
  Link2,
  MapPin,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import { MetricCard } from "@/components/CommonCard";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import type {
  VehicleGeofenceItem,
  VehicleGeofenceRow,
  VehicleGeofenceSummary,
} from "@/interfaces/vehicleGeofence.interface";
import { getAllAccounts, getFormRightForPath } from "@/services/commonServie";
import {
  deleteVehicleGeofence,
  getVehicleGeofences,
} from "@/services/vehicleGeofenceService";
import { deleteVehicleGeofenceFromJava } from "@/services/vehicleGeofenceJavaSyncService";

interface AccountOption {
  id: number;
  value: string;
}

const EMPTY_SUMMARY: VehicleGeofenceSummary = {
  totalAssignments: 0,
  active: 0,
  inactive: 0,
};

const VehicleGeofencePage: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.vehicleGeofence.list");
  const pageRight = getFormRightForPath("/vehicle-geofence");
  const canRead = pageRight ? Boolean(pageRight.canRead) : true;

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [rows, setRows] = useState<VehicleGeofenceRow[]>([]);
  const [summary, setSummary] = useState<VehicleGeofenceSummary>(EMPTY_SUMMARY);

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<VehicleGeofenceRow | null>(
    null,
  );

  const columns = useMemo(
    () => [
      { key: "no", label: t("table.no"), visible: true },
      { key: "vehicleNo", label: t("table.vehicle"), visible: true },
      { key: "geofenceName", label: t("table.geofence"), visible: true },
      { key: "geometryType", label: t("table.geometry"), visible: true },
      { key: "remarks", label: t("table.remarks"), visible: true },
      {
        key: "status",
        label: t("table.status"),
        type: "badge" as const,
        visible: true,
      },
      {
        key: "createdAt",
        label: t("table.createdOn"),
        visible: true,
        render: (value: string) =>
          value ? new Date(value).toLocaleString("en-IN") : "-",
      },
    ],
    [t],
  );

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
      console.error("Failed to parse user account:", error);
      return 0;
    }
  };

  const mapRow = (item: VehicleGeofenceItem): VehicleGeofenceRow => ({
    id: Number(item?.id || 0),
    accountId: Number(item?.accountId || selectedAccountId || 0),
    vehicleId: Number(item?.vehicleId || 0),
    geofenceId: Number(item?.geofenceId || 0),
    vehicleNo: String(item?.vehicleNo || "-"),
    deviceNo: String(
      item?.deviceNo ??
        item?.DeviceNo ??
        item?.deviceNumber ??
        item?.DeviceNumber ??
        item?.imei ??
        item?.Imei ??
        "",
    ),
    geofenceName: String(item?.geofenceName || "-"),
    geometryType: String(item?.geometryType || "-"),
    remarks: String(item?.remarks || "-"),
    status: item?.isActive ? t("status.active") : t("status.inactive"),
    createdAt: String(item?.createdAt || ""),
  });

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

  const fetchVehicleGeofences = async () => {
    if (!selectedAccountId || selectedAccountId <= 0) {
      setRows([]);
      setSummary(EMPTY_SUMMARY);
      setTotalRecords(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getVehicleGeofences({
        page: pageNo,
        pageSize,
        accountId: selectedAccountId,
        search: debouncedQuery,
      });

      const listData = response?.data?.assignments;
      const listItems = Array.isArray(listData?.items) ? listData.items : [];
      const summaryData = response?.data?.summary || EMPTY_SUMMARY;

      setRows(listItems.map(mapRow));
      setSummary({
        totalAssignments: Number(summaryData?.totalAssignments || 0),
        active: Number(summaryData?.active || 0),
        inactive: Number(summaryData?.inactive || 0),
      });
      setTotalRecords(Number(listData?.totalRecords || listItems.length));
    } catch (error) {
      console.error("Error fetching vehicle geofence list:", error);
      toast.error(t("toast.fetchFailed"));
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    const accountId = getAccountIdFromStorage();
    setSelectedAccountId(accountId);
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
    fetchVehicleGeofences();
  }, [pageNo, pageSize, debouncedQuery, selectedAccountId]);

  const handleDelete = (row: VehicleGeofenceRow) => {
    setSelectedRow(row);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRow) return;

    try {
      // await deleteVehicleGeofenceFromJava({
      //   accountId: Number(selectedRow.accountId || selectedAccountId || 0),
      //   vehicleId: Number(selectedRow.vehicleId || 0),
      //   vehicleNo: String(selectedRow.vehicleNo || ""),
      //   deviceNo: String(selectedRow.deviceNo || ""),
      //   geofenceId: Number(selectedRow.geofenceId || 0),
      // });

      const response = await deleteVehicleGeofence(selectedRow.id);
      if (response?.success || response?.statusCode === 200) {
        toast.success(response?.message || t("toast.deleted"));
        fetchVehicleGeofences();
      } else {
        toast.error(response?.message || t("toast.deleteFailed"));
      }
    } catch (error: any) {
      console.error("Error deleting vehicle geofence assignment:", error);
      toast.error(
        error?.response?.data?.message || t("toast.deleteError"),
      );
    } finally {
      setSelectedRow(null);
      setIsDeleteDialogOpen(false);
    }
  };

  if (!canRead) {
    return (
      <div className={`${isDark ? "dark" : ""} mt-10`}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-foreground">
            {t("noReadPermission")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader isVisible={loading} text="Loading vehicle geofence assignments..." />
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
          buttonRoute="/vehicle-geofence/0"
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <MetricCard
            icon={Link2}
            label={t("metrics.totalAssignments")}
            value={summary.totalAssignments}
            iconBgColor="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            isDark={isDark}
          />
          <MetricCard
            icon={MapPin}
            label={t("metrics.active")}
            value={summary.active}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            isDark={isDark}
          />
          <MetricCard
            icon={AlertCircle}
            label={t("metrics.inactive")}
            value={summary.inactive}
            iconBgColor="bg-orange-100 dark:bg-orange-900/30"
            iconColor="text-orange-600 dark:text-orange-400"
            isDark={isDark}
          />
        </div>

        <CommonTable
          columns={columns}
          data={rows}
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

export default VehicleGeofencePage;
