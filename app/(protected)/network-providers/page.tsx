"use client";

import { CircleAlert, Database, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import { MetricCard } from "@/components/CommonCard";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import type { FormRights } from "@/interfaces/account.interface";
import type {
  NetworkProvider,
} from "@/interfaces/networkProvider.interface";
import {
  deleteNetworkProvider,
  getNetworkProviders,
  updateNetworkProviderStatus,
} from "@/services/networkProviderService";

interface NetworkProviderRow {
  id: number;
  code: string;
  name: string;
  status: boolean;
  lastUpdated: string;
}

const NetworkProviders: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [networkProvidersRight, setNetworkProvidersRight] =
    useState<FormRights | null>(null);

  // Confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] =
    useState<NetworkProviderRow | null>(null);

  const [cardCounts, setCardCounts] = useState({
    total: 0,
    enabled: 0,
    disabled: 0,
  });

  const columns = [
    {
      key: "code",
      label: "CODE",
      type: "icon-text" as const,
      visible: true,
    },
    {
      key: "name",
      label: "NAME",
      visible: true,
    },
    {
      key: "status",
      label: "STATUS",
      type: "badge" as const,
      visible: true,
    },
     {
      key: "lastUpdated",
      label: "LAST UPDATED",
      visible: true,
    },

  ];

  const [data, setData] = useState<NetworkProviderRow[]>([]);

  const handleEdit = (row: NetworkProviderRow) => {
    router.push(`/network-providers/${row.id}`);
  };

  // Show confirmation dialog instead of deleting directly
  const handleDelete = (row: NetworkProviderRow) => {
    setProviderToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  const handleStatusToggle = async (row: NetworkProviderRow) => {
    const response = await updateNetworkProviderStatus(row.id, !row.status);
    if (response && (response.success || [200, 204].includes(response.statusCode))) {
      toast.success(response.message || "Status updated successfully.");
      getNetworkProvidersList();
    } else {
      toast.error(response?.message || "Failed to update status.");
    }
  };

  // Actual delete operation after confirmation
  const confirmDelete = async () => {
    if (!providerToDelete) return;

    const response = await deleteNetworkProvider(providerToDelete.id);
    if (response && (response.success || [200, 204].includes(response.statusCode))) {
      toast.success(response.message);
      if (pageNo > 1) setPageNo(1);
      else getNetworkProvidersList();
    } else {
      toast.error(response.message);
    }

    // Reset state
    setProviderToDelete(null);
  };

  const handlePageChange = (page: number) => {
    setPageNo(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNo(1);
  };

  const getNetworkProvidersList = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getNetworkProviders(pageNo, pageSize, debouncedQuery);

      if (response && (response.success || response.statusCode === 200)) {
        const listData = response?.data?.providers || {};
        const items: NetworkProvider[] = Array.isArray(listData?.items)
          ? (listData.items as NetworkProvider[])
          : [];

        const mappedRows: NetworkProviderRow[] = items.map((item) => ({
          id: Number(item.id || 0),
          code: item.code || "-",
          name: item.displayName || "-",
          status: Boolean(item.isEnabled),
          lastUpdated: item.updatedAt || item.createdAt || "",
        }));

        setData(mappedRows);
        setTotalRecords(Number(listData?.totalCount || mappedRows.length));
        setCardCounts({
          total: Number(response?.data?.summary?.totalEntities || 0),
          enabled: Number(response?.data?.summary?.enabled || 0),
          disabled: Number(response?.data?.summary?.disabled || 0),
        });
      } else {
        toast.error(response?.message ?? "Failed to load network providers");
      }
    } finally {
      setLoading(false);
    }
  }, [pageNo, pageSize, debouncedQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setPageNo(1);
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    getNetworkProvidersList();
  }, [getNetworkProvidersList]);

  useEffect(() => {
    function getPermissionsList() {
      if (typeof window === "undefined") return;

      try {
        const storedPermissions = localStorage.getItem("permissions");

        if (storedPermissions) {
          const parsedPermissions = JSON.parse(storedPermissions);
          const rights = parsedPermissions.find(
            (val: { formName?: string; pageUrl?: string }) =>
              val.formName?.toLowerCase().includes("network provider") ||
              val.pageUrl === "/network-providers",
          );

          if (rights) {
            setNetworkProvidersRight(rights);
          } else {
            console.warn('No matching rights found for "Network Providers".');
          }
        } else {
          console.warn("No permissions found in localStorage.");
        }
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
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <PageHeader
            title="Network Providers"
            subtitle="Enterprise global registry management for SaaS scalability."
            breadcrumbs={[{ label: "Master Data" }, { label: "Network Providers" }]}
            showButton={true}
            buttonText="Add New Network Provider"
            buttonRoute="/network-providers/0"
            showWriteButton={networkProvidersRight?.canWrite || false}
          />
        </div>

        {/* Metric Cards */}
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
            value={cardCounts.enabled}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            isDark={isDark}
          />
          <MetricCard
            icon={CircleAlert}
            label="STATUS: DISABLED"
            value={cardCounts.disabled}
            iconBgColor="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
            isDark={isDark}
          />
        </div>

        {/* Table Section */}
        <div className="w-full">
          <ActionLoader isVisible={loading} text="Loading network providers..." />
          <CommonTable
            columns={columns}
            data={data}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusToggle={handleStatusToggle}
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
          />
        </div>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setProviderToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Network Provider"
          message={`Are you sure you want to delete "${providerToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default NetworkProviders;