"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ActionLoader from "@/components/ActionLoader";
import CommonTable from "@/components/CommonTable";
import PageHeader from "@/components/PageHeader";
import { MetricCard } from "@/components/CommonCard";
import { useTheme } from "@/context/ThemeContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import {
  Truck,
  ShieldCheck,
  AlertCircle,
  Activity,
  Building2,
  ChevronDown,
} from "lucide-react";
import {
  VehicleBrand,
  VehicleItem,
  VehicleSummary,
  VehicleType,
} from "@/interfaces/vehicle.interface";
import {
  deleteVehicle,
  exportVehicles,
  getVehicleBrands,
  getVehicles,
  getVehicleType,
} from "@/services/vehicleService";
import { getAllAccounts } from "@/services/commonServie";

interface AccountOption {
  id: number;
  value: string;
}

// ── Component ──────────────────────────────────────────────────────────────
const Vehicles: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.vehicles.list");
  const tDetail = useTranslations("pages.vehicles.detail");

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [data, setData] = useState<VehicleItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [summaryData, setSummaryData] = useState<VehicleSummary>({
    totalFleetSize: 0,
    inService: 0,
    offRoadOrOutOfService: 0,
    activeAccounts: 0,
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<VehicleItem | null>(
    null,
  );
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "csv">("csv");
  const columns = [
    {
      key: "registrationNumber",
      label: t("table.registration"),
      visible: true,
      render: (value: string) => (
        <span className="font-semibold text-purple-600 dark:text-purple-400">
          {value}
        </span>
      ),
    },
    {
      key: "vinNumber",
      label: t("table.vin"),
      visible: true,
    },
    // {
    //   key: "vehicleBrand",
    //   label: "Type & Brand",
    //   visible: true,
    //   render: (_: string, row: VehicleItem) => (
    //     <span>
    //       {[row.vehicleType, row.vehicleBrand].filter(Boolean).join(" · ")}
    //     </span>
    //   ),
    // },
    // {
    //   key: "ownershipBasis",
    //   label: "Ownership",
    //   visible: true,
    //   render: (value: string, row: VehicleItem) => (
    //     <div>
    //       <span
    //         className={`text-xs font-semibold px-2 py-0.5 rounded ${
    //           value === "OWNED"
    //             ? "bg-blue-100 text-blue-700"
    //             : "bg-yellow-100 text-yellow-700"
    //         }`}
    //       >
    //         {value}
    //       </span>
    //       {row.lessorName && (
    //         <p className="text-xs text-gray-500 mt-0.5">{row.lessorName}</p>
    //       )}
    //     </div>
    //   ),
    // },
    {
      key: "status",
      label: t("table.status"),
      visible: true,
      type: "badge" as const,
    },
    {
      key: "updatedAt",
      label: t("table.lastUpdated"),
      visible: true,
      type: "date" as const,
    },
  ];

  const getVehicleBrand = (brandId: number) => {
    const brands: Record<number, string> = {
      1: "Tata",
      2: "Mahindra",
      3: "Maruti",
      4: "Ashok Leyland",
    };
    return brands[brandId] || t("fallback.unknown");
  };

  const getVehicleTypes = (typeId: number) => {
    const types: Record<number, string> = {
      1: "Sedan",
      2: "SUV",
      3: "Truck",
      4: "Hatchback",
      5: "Mini Truck",
    };
    return types[typeId] || t("fallback.unknown");
  };

  const getUserAccountIdFromStorage = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return Number(user?.accountId || 0);
    } catch (error) {
      console.error("Failed to parse user account:", error);
      return 0;
    }
  };

  useEffect(() => {
    const init = async () => {
      const [typeRes, brandRes] = await Promise.all([
        getVehicleType(),
        getVehicleBrands(),
      ]);

      if (typeRes) setVehicleTypes(typeRes);
      if (brandRes) setVehicleBrands(brandRes);
    };
    init();
  }, []);

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
  }, []);

  const fetchVehicles = async () => {
    if (!selectedAccountId || selectedAccountId <= 0) {
      setData([]);
      setTotalRecords(0);
      setSummaryData({
        totalFleetSize: 0,
        inService: 0,
        offRoadOrOutOfService: 0,
        activeAccounts: 0,
      });
      setIsVehiclesLoading(false);
      return;
    }

    try {
      setIsVehiclesLoading(true);
      const response = await getVehicles(
        pageNo,
        pageSize,
        debouncedQuery,
        selectedAccountId,
      );
      const vehiclesData = response.data?.vehicles; // ✅ corrected
      const summary = response.data?.summary; // ✅ corrected

      if (vehiclesData?.items?.length) {
        const mappedData = vehiclesData.items.map((v: any) => ({
          vehicleId: v.id,
          registrationNumber: v.vehicleNumber,
          vinNumber: v.vinOrChassisNumber,
          vehicleType: getVehicleTypes(v.vehicleTypeId),
          vehicleBrand: getVehicleBrand(v.vehicleTypeId), // adjust if brandId exists later
          ownershipBasis: v.ownershipType?.toUpperCase() || "UNKNOWN",
          lessorName: v.leasedVendorId
            ? t("fallback.vendor", { id: v.leasedVendorId })
            : null,
          status: v.status,
          updatedAt: v.updatedAt || v.createdAt || null,
        }));

        setSummaryData({
          totalFleetSize: summary.totalFleetSize,
          inService: summary.inService,
          offRoadOrOutOfService: summary.outOfService,
          activeAccounts: summary.inService,
        });

        setData(mappedData);
        setTotalRecords(vehiclesData.totalRecords);
      } else {
        // toast.error("No vehicles found");
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error(t("toast.loadError"));
    } finally {
      setIsVehiclesLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedAccountId || selectedAccountId <= 0) return;
    fetchVehicles();
  }, [
    pageNo,
    pageSize,
    debouncedQuery,
    vehicleTypes,
    vehicleBrands,
    selectedAccountId,
  ]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleEdit = (row: VehicleItem) => {
    router.push(`/vehicles/${row.vehicleId}`);
  };

  const handleDelete = (row: VehicleItem) => {
    setVehicleToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  const handleExport = async () => {
    if (!selectedAccountId || selectedAccountId <= 0) {
      toast.error(t("toast.exportFailed"));
      return;
    }

    try {
      const response = await exportVehicles(selectedAccountId, searchQuery, exportFormat);
      if (response?.success || Number(response?.statusCode) === 200) {
        toast.success(t("toast.exportSuccess"));
      } else {
        toast.error(response?.message || t("toast.exportFailed"));
      }
    } catch {
      toast.error(t("toast.exportFailed"));
    }
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;
    try {
      const response = await deleteVehicle(vehicleToDelete.vehicleId);
      if (response && response.statusCode === 200) {
        toast.success(response.message || t("toast.removed"));
        if (pageNo > 1 && data.length === 1) {
          setPageNo((prev) => prev - 1);
        } else {
          fetchVehicles();
        }
      } else {
        toast.error(response.message || t("toast.deleteFailed"));
      }
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error(t("toast.deleteError"));
    } finally {
      setVehicleToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader isVisible={isVehiclesLoading} text="Loading vehicles..." />
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-2`}>
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          breadcrumbs={[{ label: t("breadcrumbs.fleet") }, { label: t("breadcrumbs.current") }]}
          showButton={true}
          buttonText={t("addButton")}
          buttonRoute="/vehicles/0"
          showExportButton={true}
          ExportbuttonText={t("export")}
          onExportClick={handleExport}
          exportFormat={exportFormat}
          onExportFormatChange={setExportFormat}
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
            icon={Truck}
            label={t("metrics.totalFleetSize")}
            value={summaryData.totalFleetSize}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
            isDark={isDark}
          />
          <MetricCard
            icon={ShieldCheck}
            label={t("metrics.inService")}
            value={summaryData.inService}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
            isDark={isDark}
          />
          <MetricCard
            icon={AlertCircle}
            label={t("metrics.offRoadOutOfService")}
            value={summaryData.offRoadOrOutOfService}
            iconBgColor="bg-orange-100"
            iconColor="text-orange-600"
            isDark={isDark}
          />
          <MetricCard
            icon={Activity}
            label={t("metrics.activeVehicles")}
            value={summaryData.activeAccounts}
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
            setVehicleToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t("deleteTitle")}
          message={t("deleteMessage", {
            registration: vehicleToDelete?.registrationNumber || "",
          })}
          confirmText={t("confirmDelete")}
          cancelText={t("cancel")}
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default Vehicles;
