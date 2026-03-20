"use client";

import React, { useEffect, useState } from "react";
import CommonTable from "@/components/CommonTable";
import PageHeader from "@/components/PageHeader";
import { MetricCard } from "@/components/CommonCard";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useTheme } from "@/context/ThemeContext";
import { FormRights } from "@/interfaces/account.interface";
import {
  VehicleType,
  VehicleTypeCardCounts,
  VehicleTypeRow,
} from "@/interfaces/vehicleType.interface";
import { CircleAlert, Database, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import {
  deleteVehicleTypeById,
  getVehicleTypes,
} from "@/services/vehicletypeService";

const dotPalette = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#71717a"];

const VehicleTypes: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [vehicleTypeRight, setVehicleTypeRight] = useState<FormRights | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<VehicleTypeRow | null>(null);
  const [cardCounts, setCardCounts] = useState<VehicleTypeCardCounts>({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
  });
  const [data, setData] = useState<VehicleTypeRow[]>([]);

  const columns = [
    {
      key: "code",
      label: "CODE",
      render: (value: string) => (
        <span className="inline-flex px-3 py-1 rounded-md bg-indigo-50 text-indigo-600 font-semibold text-sm">
          {value}
        </span>
      ),
      visible: true,
    },
    {
      key: "name",
      label: "NAME",
      render: (value: string) => (
        <span className={`font-semibold ${isDark ? "text-white" : "text-black"}`}>
          {value}
        </span>
      ),
      visible: true,
    },
    {
      key: "mapVisualization",
      label: "MAP VISUALIZATION",
      render: (value: { dots: string[]; label: string }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {value.dots.map((dot, idx) => (
              <span
                key={`${dot}-${idx}`}
                className="inline-block w-3.5 h-3.5 rounded-full"
                style={{ backgroundColor: dot }}
              />
            ))}
          </div>
          <span className="text-gray-300">|</span>
          <span className="text-[#5f7693] font-semibold text-sm">
            {value.label}
          </span>
        </div>
      ),
      visible: true,
    },
    {
      key: "fuel",
      label: "FUEL",
      render: (value: string) => (
        <span className="inline-flex px-3 py-1 rounded-lg border border-gray-300 text-sm font-semibold">
          {value}
        </span>
      ),
      visible: true,
    },
    {
      key: "capacity",
      label: "CAPACITY",
      render: (value: string) => (
        <span className={`font-bold text-lg ${isDark ? "text-white" : "text-black"}`}>
          {value}
        </span>
      ),
      visible: true,
    },
    {
      key: "status",
      label: "STATUS",
      render: (value: boolean) => (
        <span
          className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg ${
            value
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {value ? "ENABLED" : "DISABLED"}
        </span>
      ),
      visible: true,
    },
    {
      key: "lastUpdated",
      label: "LAST UPDATED",
      render: (value: string) => (
        <span className="text-[#5f7693] font-semibold text-sm">{value}</span>
      ),
      visible: true,
    },
  ];

  const mapVehicleTypeToRow = (item: VehicleType): VehicleTypeRow => {
    // status may come as "Active", "Inactive", "true"/"false" etc.
    const st = String(item.status || "").trim().toLowerCase();
    const isEnabled =
      st === "active" ||
      st === "true" ||
      st === "enabled";
    const capUnit =
      String(item.fuelCategory || "").toLowerCase() === "ev" ? "kWh" : "L";
    const capacityValue = item.tankCapacity ? `${item.tankCapacity} ${capUnit}` : "-";

    return {
      id: item.id,
      code: item.vehicleTypeName
        ? `${item.vehicleTypeName.slice(0, 3).toUpperCase()}-${item.id}`
        : `VT-${item.id}`,
      name: item.vehicleTypeName || "-",
      mapVisualization: {
        dots: [item.defaultIconColor || dotPalette[0], ...dotPalette.slice(1)],
        label: String(item.category || "").toUpperCase() || "VEHICLE",
      },
      fuel: item.fuelCategory || "-",
      capacity: capacityValue,
      status: isEnabled,
      lastUpdated: item.updatedAt || item.createdAt || "-",
      raw: item,
    };
  };

  const fetchVehicleTypes = async () => {
    const response = await getVehicleTypes();

    if (Array.isArray(response)) {
      const mapped = response.map(mapVehicleTypeToRow);
      setData(mapped);
      setTotalRecords(mapped.length);
      setCardCounts({
        total: mapped.length,
        active: mapped.filter((m) => m.status).length,
        pending: mapped.filter((m) => !m.status).length,
        inactive: mapped.filter((m) => !m.status).length,
      });
      return;
    }

    if (response?.success && Array.isArray(response?.data)) {
      const mapped = response.data.map(mapVehicleTypeToRow);
      setData(mapped);
      setTotalRecords(mapped.length);
      setCardCounts({
        total: mapped.length,
        active: mapped.filter((m:any) => m.status).length,
        pending: mapped.filter((m:any) => !m.status).length,
        inactive: mapped.filter((m:any) => !m.status).length,
      });
      return;
    }

    toast.error(response?.message || "Failed to load vehicle types");
  };

  const handleEdit = (row: VehicleTypeRow) => {
    router.push(`/vehicle-types/${row.id}`);
  };

  const handleDelete = (row: VehicleTypeRow) => {
    setItemToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const response = await deleteVehicleTypeById(itemToDelete.id);
    if (response?.success || [200, 204].includes(response?.statusCode)) {
      toast.success(response?.message || "Vehicle type deleted successfully.");
      fetchVehicleTypes();
    } else {
      toast.error(response?.message || "Failed to delete vehicle type.");
    }
    setItemToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const handlePageChange = (page: number) => setPageNo(page);
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNo(1);
  };

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  useEffect(() => {
    function getPermissionsList() {
      if (typeof window === "undefined") return;

      try {
        const storedPermissions = localStorage.getItem("permissions");
        if (!storedPermissions) return;
        const parsedPermissions = JSON.parse(storedPermissions);
        const rights = parsedPermissions.find(
          (val: { formName?: string; pageUrl?: string }) =>
            val.formName?.toLowerCase().includes("vehicle type") ||
            val.pageUrl === "/vehicle-types",
        );
        if (rights) setVehicleTypeRight(rights);
      } catch (error) {
        console.error("Error fetching permissions from localStorage:", error);
      }
    }

    getPermissionsList();
  }, []);

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-2 sm:p-0 md:p-2`}
      >
        <div className="mb-4 sm:mb-6">
          <PageHeader
            title="Vehicle Types"
            subtitle="Enterprise global registry management for SaaS scalability."
            breadcrumbs={[{ label: "Master Data" }, { label: "Vehicle Types" }]}
            showButton={true}
            buttonText="Add New Vehicle Type"
            buttonRoute="/vehicle-types/0"
            showWriteButton={vehicleTypeRight?.canWrite || false}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <MetricCard
            icon={Database}
            label="TOTAL ENITIES"
            value={cardCounts.total}
            iconBgColor="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            isDark={isDark}
          />
          <MetricCard
            icon={ShieldCheck}
            label="STATUS: ENABLED"
            value={cardCounts.active}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            isDark={isDark}
          />
          <MetricCard
            icon={CircleAlert}
            label="STATUS: DISABLED"
            value={cardCounts.pending}
            iconBgColor="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
            isDark={isDark}
          />
        </div>

        <div className="w-full">
          <CommonTable
            columns={columns}
            data={data}
            onEdit={handleEdit}
            onDelete={handleDelete}
            showActions={true}
            searchPlaceholder="Search..."
            rowsPerPageOptions={[2, 4, 5, 10, 25, 50, 100]}
            defaultRowsPerPage={10}
            pageNo={pageNo}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalRecords={totalRecords}
            isServerSide={false}
          />
        </div>

        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Vehicle Type"
          message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default VehicleTypes;
