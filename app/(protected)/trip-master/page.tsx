"use client";

import { CalendarClock, Route, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { MetricCard } from "@/components/CommonCard";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import { deleteTripPlan, getTripPlans } from "@/services/tripMasterService";

type TripListRow = {
  id: number;
  tripName: string;
  routeName: string;
  vehicleNo: string;
  driverName: string;
  cycle: "Weekly" | "Monthly" | "One-Off";
  status: "Active" | "Pending" | "In Transit" | "Completed";
  startTime: string;
};

type TripPlanApiItem = {
  planId?: number;
  routeName?: string;
  vehicleNo?: string;
  driverId?: number;
  tripTypeLabel?: TripListRow["cycle"];
  isActive?: boolean;
  startTime?: string;
  createdDatetime?: string;
};

const TripMasterPage: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.tripMaster.list");

  const [rows, setRows] = useState<TripListRow[]>([]);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [summary, setSummary] = useState({
    totalTrips: 0,
    activeTrips: 0,
    inTransitTrips: 0,
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<TripListRow | null>(null);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((row) =>
      [
        row.tripName,
        row.routeName,
        row.vehicleNo,
        row.driverName,
        row.cycle,
        row.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, searchQuery]);

  const mapRow = useCallback(
    (item: TripPlanApiItem): TripListRow => ({
      id: Number(item?.planId || 0),
      tripName: `Trip Plan #${Number(item?.planId || 0)}`,
      routeName: String(item?.routeName || "-"),
      vehicleNo: String(item?.vehicleNo || "-"),
      driverName: item?.driverId ? `Driver #${item.driverId}` : "-",
      cycle: item?.tripTypeLabel || "One-Off",
      status: item?.isActive ? "Active" : "Completed",
      startTime: String(item?.startTime || item?.createdDatetime || ""),
    }),
    [],
  );

  const fetchTripPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getTripPlans({
        page: pageNo,
        pageSize,
      });

      const listData = response?.data?.trips || {};
      const items = Array.isArray(listData?.items) ? listData.items : [];
      const summaryData = response?.data?.summary || {};

      setRows(items.map(mapRow));
      setTotalRecords(Number(listData?.totalRecords || items.length));
      setSummary({
        totalTrips: Number(summaryData?.totalRecords || items.length),
        activeTrips: Number(summaryData?.totalActive || 0),
        inTransitTrips: Number(summaryData?.totalInactive || 0),
      });
    } catch (error) {
      console.error("Error fetching trip plans:", error);
      toast.error("Failed to fetch trip plans");
      setRows([]);
      setTotalRecords(0);
      setSummary({
        totalTrips: 0,
        activeTrips: 0,
        inTransitTrips: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [mapRow, pageNo, pageSize]);

  const handleDelete = (row: TripListRow) => {
    setRowToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!rowToDelete) return;
    try {
      const response = await deleteTripPlan(rowToDelete.id);
      if (response?.success || Number(response?.statusCode || 0) === 200) {
        toast.success(response?.message || "Trip plan deleted successfully");
        fetchTripPlans();
        setIsDeleteDialogOpen(false);
        setRowToDelete(null);
        return;
      }
      toast.error(response?.message || "Failed to delete trip plan");
    } catch (error) {
      console.error("Error deleting trip plan:", error);
      toast.error("Failed to delete trip plan");
    } finally {
      setIsDeleteDialogOpen(false);
      setRowToDelete(null);
    }
  };

  useEffect(() => {
    fetchTripPlans();
  }, [fetchTripPlans]);

  const columns = useMemo(
    () => [
      { key: "no", label: t("table.no"), visible: true },
      { key: "tripName", label: t("table.tripName"), visible: true },
      { key: "routeName", label: t("table.route"), visible: true },
      { key: "vehicleNo", label: t("table.vehicle"), visible: true },
      { key: "driverName", label: t("table.driver"), visible: true },
      {
        key: "cycle",
        label: t("table.cycle"),
        visible: true,
        render: (value: TripListRow["cycle"]) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md ${
              value === "Weekly"
                ? "bg-indigo-100 text-indigo-700"
                : value === "Monthly"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-gray-100 text-gray-700"
            }`}
          >
            {value === "Weekly"
              ? t("labels.cycle.weekly")
              : value === "Monthly"
                ? t("labels.cycle.monthly")
                : t("labels.cycle.oneOff")}
          </span>
        ),
      },
      {
        key: "status",
        label: t("table.status"),
        visible: true,
        type: "badge" as const,
      },
      {
        key: "startTime",
        label: t("table.startTime"),
        visible: true,
        render: (value: string) =>
          value ? new Date(value).toLocaleString("en-IN") : "-",
      },
    ],
    [t],
  );

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
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
          buttonRoute="/trip-master/0"
          showExportButton={false}
          showFilterButton={false}
          showBulkUpload={false}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <MetricCard
            icon={Route}
            label={t("metrics.totalTrips")}
            value={summary.totalTrips}
            iconBgColor="bg-indigo-100 dark:bg-indigo-900/30"
            iconColor="text-indigo-600 dark:text-indigo-400"
            isDark={isDark}
          />
          <MetricCard
            icon={Truck}
            label={t("metrics.activeTrips")}
            value={summary.activeTrips}
            iconBgColor="bg-emerald-100 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
            isDark={isDark}
          />
          <MetricCard
            icon={CalendarClock}
            label={t("metrics.inTransit")}
            value={summary.inTransitTrips}
            iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
            iconColor="text-yellow-600 dark:text-yellow-400"
            isDark={isDark}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <p>{t("title")}...</p>
          </div>
        ) : (
          <CommonTable
            columns={columns}
            data={filteredRows}
            onEdit={(row) => router.push(`/trip-master/${row.id}`)}
            onDelete={handleDelete}
            showActions={true}
            searchPlaceholder={t("searchPlaceholder")}
            rowsPerPageOptions={[10, 25, 50, 100]}
            pageNo={pageNo}
            pageSize={pageSize}
            onPageChange={setPageNo}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageNo(1);
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalRecords={searchQuery ? filteredRows.length : totalRecords}
            isServerSide={true}
          />
        )}

        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setRowToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t("deleteDialog.title")}
          message={t("deleteDialog.message", {
            name: rowToDelete?.tripName || "-",
          })}
          confirmText={t("deleteDialog.confirm")}
          cancelText={t("deleteDialog.cancel")}
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default TripMasterPage;
