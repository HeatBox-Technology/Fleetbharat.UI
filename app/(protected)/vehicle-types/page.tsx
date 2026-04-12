"use client";

import React, { useEffect, useRef, useState } from "react";
import CommonTable from "@/components/CommonTable";
import ActionLoader from "@/components/ActionLoader";
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
import { Building2, ChevronDown, CircleAlert, Database, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import {
  deleteVehicleTypeById,
  getVehicleTypes,
} from "@/services/vehicletypeService";
import { getAccountHierarchy } from "@/services/accountService";

const resolveAssetUrl = (path?: string | null) => {
  const value = String(path || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const baseUrl = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
    /\/+$/,
    "",
  );
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

const VehicleTypes: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Array<{ id: number; value: string }>>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
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
  const [loading, setLoading] = useState(true);
  const latestFetchIdRef = useRef(0);

  const getLocalAccountId = (): number => {
    if (typeof window === "undefined") return 0;
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return Number(user?.accountId || 0);
    } catch {
      return 0;
    }
  };

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
      key: "stateIcons",
      label: "STATE ICONS",
      render: (value: string[]) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {value.map((icon, idx) => (
              <div
                key={`${icon}-${idx}`}
                className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-200 shadow-sm bg-white shrink-0"
              >
                {icon ? (
                  <img
                    src={icon}
                    alt={`State icon ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100" />
                )}
              </div>
            ))}
          </div>
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
    const fuel = String(item.fuelCategory || "").toLowerCase();
    const capUnit =
      fuel.includes("electric") || fuel === "ev" ? "kWh" : "L";
    const capacityValue = item.tankCapacity ? `${item.tankCapacity} ${capUnit}` : "-";

    return {
      id: item.id,
      code: item.vehicleTypeName
        ? `${item.vehicleTypeName.slice(0, 3).toUpperCase()}-${item.id}`
        : `VT-${item.id}`,
      name: item.vehicleTypeName || "-",
      stateIcons: [
        resolveAssetUrl(item.movingIcon),
        resolveAssetUrl(item.stoppedIcon),
        resolveAssetUrl(item.idleIcon),
        resolveAssetUrl(item.parkedIcon),
        resolveAssetUrl(item.offlineIcon),
        resolveAssetUrl(item.breakdownIcon),
      ],
      fuel: item.fuelCategory || "-",
      capacity: capacityValue,
      status: isEnabled,
      lastUpdated: item.updatedAt || item.createdAt || "-",
      raw: item,
    };
  };

  const fetchAccounts = async () => {
    try {
      const response = await getAccountHierarchy();
      const accountList = Array.isArray(response?.data) ? response.data : [];
      setAccounts(
        accountList.map((item: { id?: number; value?: string; name?: string }) => ({
          id: Number(item?.id || 0),
          value: String(item?.value || item?.name || item?.id || ""),
        })),
      );
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchVehicleTypes = async () => {
    const fetchId = ++latestFetchIdRef.current;
    setLoading(true);
    try {
      const response = await getVehicleTypes(selectedAccountId);

      if (Array.isArray(response)) {
        const filtered =
          selectedAccountId > 0
            ? response.filter(
                (item) => Number(item?.accountId || 0) === selectedAccountId,
              )
            : response;
        const mapped = filtered.map(mapVehicleTypeToRow);
        if (fetchId !== latestFetchIdRef.current) return;
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
        const filtered =
          selectedAccountId > 0
            ? response.data.filter(
                (item:any) => Number(item?.accountId || 0) === selectedAccountId,
              )
            : response.data;
        const mapped = filtered.map(mapVehicleTypeToRow);
        if (fetchId !== latestFetchIdRef.current) return;
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

      if (fetchId !== latestFetchIdRef.current) return;
      toast.error(response?.message || "Failed to load vehicle types");
    } catch (error) {
      if (fetchId !== latestFetchIdRef.current) return;
      toast.error("Failed to load vehicle types");
    } finally {
      if (fetchId === latestFetchIdRef.current) {
        setLoading(false);
      }
    }
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
    const accountId = getLocalAccountId();
    setSelectedAccountId(accountId);
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchVehicleTypes();
  }, [selectedAccountId]);

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

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-6">
          <div className="relative w-full sm:w-auto sm:min-w-[220px]">
            <Building2
              className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-gray-300" : "text-gray-500"}`}
            />
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(Number(e.target.value))}
              className={`w-full appearance-none pl-10 pr-10 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                isDark
                  ? "bg-card border-gray-700 text-foreground"
                  : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              <option value={0}>Select Account</option>
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
          <ActionLoader isVisible={loading} text="Loading vehicle types..." />
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
