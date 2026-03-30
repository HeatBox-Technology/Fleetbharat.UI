"use client";

import { Building2, CheckCircle, Clock, MapPin, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import { MetricCard } from "@/components/CommonCard";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import { AccountData, FormRights } from "@/interfaces/account.interface";
import { deleteAccount, getAccounts } from "@/services/accountService";
import { getUserRoleData } from "@/services/commonServie";

const Accounts: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.accounts.list");
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
  const [isAccountsLoading, setIsAccountsLoading] = useState(false);

  const [cardCounts, setCardCounts] = useState({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
  });

  const columns = [
    {
      key: "no",
      label: t("table.no"),
      visible: true,
    },
    {
      key: "accountCode",
      label: t("table.code"),
      type: "link" as const,
      visible: true,
    },
    {
      key: "accountName",
      label: t("table.instance"),
      visible: true,
    },
    {
      key: "phone",
      label: t("table.contact"),
      visible: true,
    },
    {
      key: "address",
      label: t("table.location"),
      type: "icon-text" as const,
      icon: <MapPin className="w-4 h-4" />,
      visible: true,
    },
    {
      key: "status",
      label: t("table.status"),
      type: "badge" as const,
      visible: true,
    },
  ];

  const [data, setData] = useState<AccountData[]>([]);
  const isSystemRoleAccount = (row: AccountData) =>
    String(row?.categoryName || "").toLowerCase() === "systemrole";

  const handleEdit = (row: AccountData) => {
    if (isSystemRoleAccount(row)) return;
    router.push(`/accounts/${row.accountId}`);
  };

  // Show confirmation dialog instead of deleting directly
  const handleDelete = (row: AccountData) => {
    if (isSystemRoleAccount(row)) return;
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
    try {
      setIsAccountsLoading(true);
      const response = await getAccounts(pageNo, pageSize, debouncedQuery);

      if (response && response.statusCode === 200) {
        const pageData = response.data.pageData;
        setData(pageData.items);
        setTotalRecords(pageData.totalRecords);
        setCardCounts(response.data.cardCounts);
      } else {
        toast.error(response?.message ?? t("toast.loadFailed"));
      }
    } finally {
      setIsAccountsLoading(false);
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
      <ActionLoader isVisible={isAccountsLoading} text="Loading accounts..." />
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-2 sm:p-0 md:p-2`}
      >
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <PageHeader
            title={t("title")}
            subtitle={t("subtitle")}
            breadcrumbs={[
              { label: t("breadcrumbs.accounts") },
              { label: t("breadcrumbs.current") },
            ]}
            showButton={true}
            buttonText={t("addButton")}
            buttonRoute="/accounts/0"
            showWriteButton={accountsRight?.canWrite || false}
          />
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <MetricCard
            icon={Building2}
            label={t("metrics.total")}
            value={cardCounts.total}
            iconBgColor="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            isDark={isDark}
          />
          <MetricCard
            icon={CheckCircle}
            label={t("metrics.active")}
            value={cardCounts.active}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            isDark={isDark}
          />
          <MetricCard
            icon={Clock}
            label={t("metrics.pending")}
            value={cardCounts.pending}
            iconBgColor="bg-orange-100 dark:bg-orange-900/30"
            iconColor="text-orange-600 dark:text-orange-400"
            isDark={isDark}
          />
          <MetricCard
            icon={XCircle}
            label={t("metrics.inactive")}
            value={cardCounts.inactive}
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
            isEditDisabled={isSystemRoleAccount}
            isDeleteDisabled={isSystemRoleAccount}
            showActions={true}
            searchPlaceholder={t("searchPlaceholder")}
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
          title={t("delete.title")}
          message={t("delete.message", {
            instance:
              accountToDelete?.accountName ||
              accountToDelete?.accountCode ||
              "",
          })}
          confirmText={t("delete.confirm")}
          cancelText={t("delete.cancel")}
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default Accounts;
