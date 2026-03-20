"use client";

import {
  AlertTriangle,
  Building2,
  CheckCircle,
  ChevronDown,
  UserRound,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { MetricCard } from "@/components/CommonCard";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import { FormRights } from "@/interfaces/account.interface";
import { getAllAccounts } from "@/services/commonServie";
import { deleteDriver, exportDrivers, getDrivers } from "@/services/driverService";

interface DriverRow {
  driverId: number;
  accountId?: number;
  name?: string;
  mobile?: string;
  licenseNumber?: string;
  licenceNumber?: string;
  licenseExpiry?: string;
  licenceExpiry?: string;
  isActive?: boolean;
}

interface AccountOption {
  id: number;
  value: string;
}

const Drivers: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.driver.list");
  const tDetail = useTranslations("pages.driver.detail");
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<DriverRow[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [categoryRights, setCategoryRights] = useState<FormRights | null>(null);
  const [cardCounts, setCardCounts] = useState({
    totalDrivers: 0,
    activeDrivers: 0,
    inactiveDrivers: 0,
    licenseExpiringSoon: 0,
  });

  // Confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<DriverRow | null>(
    null,
  );

  const columns = [
    {
      key: "driverId",
      label: t("table.driverId"),
      visible: true,
    },
    {
      key: "name",
      label: t("table.driverName"),
      visible: true,
    },
    {
      key: "mobile",
      label: t("table.mobile"),
      visible: true,
    },
    {
      key: "licenseNumber",
      label: t("table.licenceNo"),
      visible: true,
    },
    {
      key: "licenseExpiry",
      label: t("table.licenceExpiry"),
      visible: true,
      render: (value: string) =>
        value ? new Date(value).toLocaleDateString() : "-",
    },
    {
      key: "isActive",
      label: t("table.status"),
      type: "badge" as const,
      visible: true,
    },
  ];

  const fetchCategories = async () => {
    if (!selectedAccountId || selectedAccountId <= 0) {
      setCategories([]);
      setTotalRecords(0);
      setCardCounts({
        totalDrivers: 0,
        activeDrivers: 0,
        inactiveDrivers: 0,
        licenseExpiringSoon: 0,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getDrivers(
        pageNo,
        pageSize,
        searchQuery,
        selectedAccountId,
      );
      console.log(response);
      if (response.success) {
        const driverList = response?.data?.drivers?.items || [];
        setCategories(driverList);
        setTotalRecords(
          response?.data?.drivers?.totalRecords || driverList.length,
        );

        const summary = response?.data?.summary;

        const totalDrivers = summary?.totalDrivers ?? driverList.length;
        const activeDrivers =
          summary?.active ??
          driverList.filter((driver: DriverRow) => driver?.isActive).length;
        const inactiveDrivers =
          summary?.inactive ??
          driverList.filter((driver: DriverRow) => !driver?.isActive).length;
        const licenseExpiringSoon = summary?.licenseExpiringSoon ?? 0;

        setCardCounts({
          totalDrivers,
          activeDrivers,
          inactiveDrivers,
          licenseExpiringSoon,
        });
      } else {
        console.error("Failed to fetch categories:", response.message);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (row: DriverRow) => {
    router.push(`/driver/${row.driverId}`);
  };

  // Show confirmation dialog instead of browser confirm
  const handleDelete = (row: DriverRow) => {
    setCategoryToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  // Actual delete operation after confirmation
  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await deleteDriver(categoryToDelete.driverId);
      if (response.success) {
        toast.success(t("toast.deleted"));
        fetchCategories(); // Refresh list
      } else {
        toast.error(`${t("toast.deleteFailed")}: ${response.message}`);
      }
    } catch (error) {
      toast.error(t("toast.deleteError"));
      console.error("Error deleting driver:", error);
    } finally {
      setCategoryToDelete(null);
    }
  };

  const handleExport = async () => {
    try {
      const response = await exportDrivers(selectedAccountId, searchQuery);
      if (response?.success || Number(response?.statusCode) === 200) {
        toast.success(t("toast.exportSuccess"));
      } else {
        toast.error(response?.message || t("toast.exportFailed"));
      }
    } catch {
      toast.error(t("toast.exportFailed"));
    }
  };

  const handlePageChange = (page: number) => {
    setPageNo(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNo(1);
  };

  useEffect(() => {
    const initAccounts = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const userAccountId = Number(user?.accountId || 0);
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

  useEffect(() => {
    if (!selectedAccountId || selectedAccountId <= 0) return;
    fetchCategories();
  }, [pageNo, pageSize, searchQuery, selectedAccountId]);

  useEffect(() => {
    function getPermissionsList() {
      try {
        if (typeof window === "undefined") return;
        const storedPermissions = localStorage.getItem("permissions");

        if (storedPermissions) {
          const parsedPermissions = JSON.parse(storedPermissions);

          const rights = parsedPermissions.find(
            (val: { formName: string }) => val.formName === "Categories",
          );

          if (rights) {
            setCategoryRights(rights);
          } else {
            console.warn('No matching rights found for "Categories".');
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
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-2`}>
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.fleet") },
            { label: t("breadcrumbs.current") },
          ]}
          showButton={true}
          buttonText={t("addButton")}
          buttonRoute="/driver/0"
          showExportButton={true}
          ExportbuttonText={t("export")}
          onExportClick={handleExport}
          // showWriteButton={driverRights?.canWrite || false}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <MetricCard
            icon={UserRound}
            label={t("metrics.totalDrivers")}
            value={cardCounts.totalDrivers}
            iconBgColor="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            isDark={isDark}
          />
          <MetricCard
            icon={CheckCircle}
            label={t("metrics.activeDrivers")}
            value={cardCounts.activeDrivers}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            isDark={isDark}
          />
          <MetricCard
            icon={XCircle}
            label={t("metrics.inactiveDrivers")}
            value={cardCounts.inactiveDrivers}
            iconBgColor="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
            isDark={isDark}
          />
          <MetricCard
            icon={AlertTriangle}
            label={t("metrics.licenseExpiringSoon")}
            value={cardCounts.licenseExpiringSoon}
            iconBgColor="bg-indigo-100 dark:bg-indigo-900/30"
            iconColor="text-indigo-600 dark:text-indigo-400"
            isDark={isDark}
          />
        </div>
        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <p>{t("loading")}</p>
          </div>
        ) : (
          <CommonTable
            columns={columns}
            data={categories}
            onEdit={handleEdit}
            onDelete={handleDelete}
            showActions={true}
            searchPlaceholder={t("searchPlaceholder")}
            rowsPerPageOptions={[10, 25, 50, 100]}
            defaultRowsPerPage={10}
            pageNo={pageNo}
            pageSize={pageSize}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            totalRecords={totalRecords}
            isServerSide={true}
          />
        )}

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setCategoryToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t("deleteDialog.title")}
          message={t("deleteDialog.message", {
            name: categoryToDelete?.name || "-",
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

export default Drivers;
