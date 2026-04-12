"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import CommonTable from "@/components/CommonTable";
import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import { MetricCard } from "@/components/CommonCard";
import { useTheme } from "@/context/ThemeContext";
import MultiSelect from "@/components/MultiSelect";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { getUsers, deleteUser } from "@/services/userService";
import { UserItem } from "@/interfaces/user.interface";
import { Users as UsersIcon, CheckCircle, Lock, Shield } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const Users: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.users.list");

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [summaryData, setSummaryData] = useState({
    totalUsers: 0,
    active: 0,
    suspendedOrLocked: 0,
    twoFactorEnabled: 0,
  });

  // Confirmation dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);

  const roleOptions = [
    { label: "Super Admin", value: "SUPER_ADMIN" },
    { label: "Account Manager", value: "ACCOUNT_MANAGER" },
    { label: "Viewer", value: "VIEWER" },
  ];

  const statusOptions = [
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
    { label: "Locked", value: "LOCKED" },
    { label: "Suspended", value: "SUSPENDED" },
  ];

  const [appliedFilters, setAppliedFilters] = useState({
    roles: [] as { label: string; value: string }[],
    statuses: [] as { label: string; value: string }[],
  });
  const [exportFormat, setExportFormat] = useState<"excel" | "csv">("csv");

  const columns = [
    { key: "fullName", label: t("table.fullName"), visible: true },
    { key: "email", label: t("table.email"), visible: true },
    { key: "roleName", label: t("table.role"), visible: true },
    { key: "accountName", label: t("table.account"), visible: true },
    { key: "status", label: t("table.status"), type: "badge" as const, visible: true },
    {
      key: "twoFactorEnabled",
      label: t("table.twoFa"),
      visible: true,
      render: (value: boolean) =>
        value ? t("twoFa.enabled") : t("twoFa.disabled"),
    },
    {
      key: "lastLoginAt",
      label: t("table.lastLogin"),
      visible: true,
      type: "date" as const,
    },
  ];

  const handleEdit = (row: UserItem) => {
    router.push(`/users/${row.userId}`);
  };

  // Open confirmation dialog
  const handleDelete = (row: UserItem) => {
    setUserToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const response = await deleteUser(userToDelete.userId);

      if (response && response.statusCode === 200) {
        toast.success(t("toast.deleted"));
        fetchUsers();
      } else {
        toast.error(response.message || t("toast.deleteFailed"));
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(t("toast.deleteError"));
    } finally {
      setUserToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers(pageNo, pageSize, debouncedQuery);
      if (response && response.statusCode === 200) {
        setSummaryData(response.data.summary);
        setTotalRecords(response.data.users.totalRecords || 0);
        setData(response.data.users.items || []);
      } else {
        toast.error(t("toast.fetchFailed"));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pageNo, pageSize, debouncedQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handlePageChange = (page: number) => setPageNo(page);
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNo(1);
  };

  const handleExport = () => {
    toast.info(t("toast.exportSoon"));
  };

  const handleFilter = () => {
    setIsFilterOpen((prev) => !prev);
  };

  const handleResetFilters = () => {
    setAppliedFilters({ roles: [], statuses: [] });
    toast.info(t("toast.filtersReset"));
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-2`}>
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          breadcrumbs={[{ label: t("breadcrumbs.users") }, { label: t("breadcrumbs.current") }]}
          showButton={true}
          buttonText={t("addButton")}
          buttonRoute="/users/0"
          showExportButton={true}
          ExportbuttonText={t("export")}
          onExportClick={handleExport}
          exportFormat={exportFormat}
          onExportFormatChange={setExportFormat}
          showFilterButton={false}
          FilterbuttonText={t("filter")}
          onFilterClick={handleFilter}
          showWriteButton={true}
        />

        {/* Filter Section */}
        {isFilterOpen && (
          <div className="mb-6 rounded-xl bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold">{t("filters.title")}</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleResetFilters}
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  {t("filters.resetAll")}
                </button>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t("filters.close")}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="min-w-[260px]">
                <MultiSelect
                  options={roleOptions}
                  value={appliedFilters.roles}
                  onChange={(roles) =>
                    setAppliedFilters((prev) => ({ ...prev, roles }))
                  }
                  placeholder={t("filters.roles")}
                  searchPlaceholder={t("filters.searchRoles")}
                />
              </div>
              <div className="min-w-[260px]">
                <MultiSelect
                  options={statusOptions}
                  value={appliedFilters.statuses}
                  onChange={(statuses) =>
                    setAppliedFilters((prev) => ({ ...prev, statuses }))
                  }
                  placeholder={t("filters.status")}
                  searchPlaceholder={t("filters.searchStatus")}
                />
              </div>
            </div>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={UsersIcon}
            label={t("metrics.totalUsers")}
            value={summaryData.totalUsers}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
            isDark={isDark}
          />
          <MetricCard
            icon={CheckCircle}
            label={t("metrics.active")}
            value={summaryData.active}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
            isDark={isDark}
          />
          <MetricCard
            icon={Lock}
            label={t("metrics.suspendedLocked")}
            value={summaryData.suspendedOrLocked}
            iconBgColor="bg-orange-100"
            iconColor="text-orange-600"
            isDark={isDark}
          />
          <MetricCard
            icon={Shield}
            label={t("metrics.twoFactorEnabled")}
            value={summaryData.twoFactorEnabled}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
            isDark={isDark}
          />
        </div>

        {/* Table */}
        <ActionLoader isVisible={loading} text="Loading users..." />
        <CommonTable
          columns={columns}
          data={data}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showActions={true}
          searchPlaceholder={t("searchPlaceholder")}
          rowsPerPageOptions={[10, 25, 50, 100]}
          defaultRowsPerPage={10}
          pageNo={pageNo}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          totalRecords={totalRecords}
          onPageSizeChange={handlePageSizeChange}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setUserToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t("delete.title")}
          message={t("delete.message", { name: userToDelete?.fullName || "" })}
          confirmText={t("delete.confirm")}
          cancelText={t("delete.cancel")}
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default Users;
