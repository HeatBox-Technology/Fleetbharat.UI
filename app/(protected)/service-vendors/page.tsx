"use client";

import React, { useCallback, useEffect, useState } from "react";
import CommonTable from "@/components/CommonTable";
import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import { MetricCard } from "@/components/CommonCard";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useTheme } from "@/context/ThemeContext";
import { Database, ShieldCheck, CircleAlert } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
// Import Service Vendor Services
import { 
  getServiceVendors, 
  deleteServiceVendor, 
  updateServiceVendorStatus 
} from "@/services/serviceVendorService";
import { FormRights } from "@/interfaces/account.interface";

interface ServiceVendorRow {
  id: number;
  code: string;
  name: string;
  status: boolean;
  lastUpdated: string;
}

const ServiceVendors: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [rights, setRights] = useState<FormRights | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ServiceVendorRow | null>(null);

  const [cardCounts, setCardCounts] = useState({
    total: 0,
    enabled: 0,
    disabled: 0,
  });

  const columns = [
    { key: "code", label: "CODE", type: "icon-text" as const, visible: true },
    { key: "name", label: "NAME", visible: true },
    { key: "status", label: "STATUS", type: "badge" as const, visible: true },
    { key: "lastUpdated", label: "LAST UPDATED", visible: true },
  ];

  const [data, setData] = useState<ServiceVendorRow[]>([]);

  const handleEdit = (row: ServiceVendorRow) => {
    router.push(`/service-vendors/${row.id}`);
  };

  const handleDelete = (row: ServiceVendorRow) => {
    setItemToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  const handleStatusToggle = async (row: ServiceVendorRow) => {
    const res = await updateServiceVendorStatus(row.id, !row.status);
    if (res.success || res.statusCode === 200) {
      toast.success(res.message || "Status updated");
      getVendorsList();
    } else {
      toast.error(res.message || "Update failed");
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const response = await deleteServiceVendor(itemToDelete.id);
    if (response.success || response.statusCode === 200) {
      toast.success(response.message || "Deleted successfully");
      setPageNo(1);
      getVendorsList();
    } else {
      toast.error(response.message || "Delete failed");
    }
    setIsDeleteDialogOpen(false);
  };

  const getVendorsList = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getServiceVendors(pageNo, pageSize, debouncedQuery);

      if (response.success || response.statusCode === 200) {
        const items = response.data?.vendors?.items || [];
        const mappedData = items.map((i: any) => ({
          id: i.id,
          code: i.code,
          name: i.displayName,
          status: i.isEnabled,
          lastUpdated: i.updatedAt || i.createdAt,
        }));
        setData(mappedData);
        setTotalRecords(response.data?.vendors?.totalRecords || 0);
        setCardCounts({
          total: response.data?.summary?.totalEntities || 0,
          enabled: response.data?.summary?.enabled || 0,
          disabled: response.data?.summary?.disabled || 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [pageNo, pageSize, debouncedQuery]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    getVendorsList();
  }, [getVendorsList]);

  useEffect(() => {
    const stored = localStorage.getItem("permissions");
    if (stored) {
      const parsed = JSON.parse(stored);
      const found = parsed.find((v: any) => v.formName?.toLowerCase().includes("service vendor"));
      if (found) setRights(found);
    }
  }, []);

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-2 sm:p-0 md:p-2`}>
        <div className="mb-4 sm:mb-6">
          <PageHeader
            title="Service Vendors"
            subtitle="Enterprise global registry management for SaaS scalability."
            breadcrumbs={[{ label: "Master Data" }, { label: "Service Vendors" }]}
            showButton={true}
            buttonText="Add New Service Vendor"
            buttonRoute="/service-vendors/0"
            showWriteButton={rights?.canWrite || true}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <MetricCard
            icon={Database} label="TOTAL ENITIES" value={cardCounts.total} isDark={isDark}
            iconBgColor="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400"
          />
          <MetricCard
            icon={ShieldCheck} label="STATUS: ENABLED" value={cardCounts.enabled} isDark={isDark}
            iconBgColor="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600 dark:text-green-400"
          />
          <MetricCard
            icon={CircleAlert} label="STATUS: DISABLED" value={cardCounts.disabled} isDark={isDark}
            iconBgColor="bg-red-100 dark:bg-red-900/30" iconColor="text-red-600 dark:text-red-400"
          />
        </div>

        <div className="w-full">
          <ActionLoader isVisible={loading} text="Loading service vendors..." />
          <CommonTable
            columns={columns}
            data={data}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusToggle={handleStatusToggle}
            showActions={true}
            pageNo={pageNo}
            pageSize={pageSize}
            onPageChange={setPageNo}
            onPageSizeChange={(s) => {setPageSize(s); setPageNo(1);}}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalRecords={totalRecords}
          />
        </div>

        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Service Vendor"
          message={`Are you sure you want to delete "${itemToDelete?.name}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default ServiceVendors;