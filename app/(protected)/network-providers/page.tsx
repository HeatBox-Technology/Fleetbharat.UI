"use client";

import React, { useEffect, useState } from "react";
import CommonTable from "@/components/CommonTable";
import PageHeader from "@/components/PageHeader";
import { MetricCard } from "@/components/CommonCard";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useTheme } from "@/context/ThemeContext";
import { deleteAccount, getAccounts } from "@/services/accountService";
import { AccountData, FormRights } from "@/interfaces/account.interface";
import { Building2, CheckCircle, Clock, XCircle, MapPin, Database, ShieldCheck, CircleAlert } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { getUserRoleData } from "@/services/commonServie";

const NetworkProviders: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [totalRecords, setTotalRecords] = useState(0);
  const [accountsRight, setAccountRights] = useState<FormRights | null>(null);

  // Confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<AccountData | null>(
    null,
  );

  const [cardCounts, setCardCounts] = useState({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
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

  const [data, setData] = useState<AccountData[]>([]);

  const handleEdit = (row: AccountData) => {
    router.push(`/network-providers/${row.accountId}`);
  };

  // Show confirmation dialog instead of deleting directly
  const handleDelete = (row: AccountData) => {
    setAccountToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  // Actual delete operation after confirmation
  const confirmDelete = async () => {
    if (!accountToDelete) return;

    const response = await deleteAccount(accountToDelete.accountId);
    if (response && response.statusCode === 200) {
      toast.success(response.message);
      if (pageNo > 1) setPageNo(1);
      else getAccountsList();
    } else {
      toast.error(response.message);
    }

    // Reset state
    setAccountToDelete(null);
  };

  const handlePageChange = (page: number) => {
    setPageNo(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNo(1);
  };

  async function getAccountsList() {
    const response = await getAccounts(pageNo, pageSize, debouncedQuery);

    if (response && response.statusCode === 200) {
      const pageData = response.data.pageData;
      setData(pageData.items);
      setTotalRecords(pageData.totalRecords);
      setCardCounts(response.data.cardCounts);
    } else {
      toast.error(response?.message ?? "Failed to load accounts");
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    getAccountsList();
  }, [pageNo, pageSize, debouncedQuery]);

  useEffect(() => {
    function getPermissionsList() {
      if (typeof window === "undefined") return;

      try {
        const storedPermissions = localStorage.getItem("permissions");

        if (storedPermissions) {
          const parsedPermissions = JSON.parse(storedPermissions);
          const rights = parsedPermissions.find(
            (val: { formName: string }) => val.formName === "Account List",
          );

          if (rights) {
            setAccountRights(rights);
          } else {
            console.warn('No matching rights found for "Account List".');
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
            showWriteButton={accountsRight?.canWrite || false}
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

        {/* Table Section */}
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
          />
        </div>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setAccountToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Network Provider"
          message={`Are you sure you want to delete "${accountToDelete?.instance}"? This action cannot be undone.`}
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
