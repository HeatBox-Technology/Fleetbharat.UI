// Roles.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import CommonTable from "@/components/CommonTable";
import PageHeader from "@/components/PageHeader";
import { MetricCard } from "@/components/CommonCard";
import { useTheme } from "@/context/ThemeContext";
import { Shield, Lock, Users as UsersIcon } from "lucide-react";
import { toast } from "react-toastify";
import { deleteRole, exportRoles, getRoles } from "@/services/rolesService";
import { RoleAccount } from "@/interfaces/permission.interface";
import { useRouter } from "next/navigation";
import ConfirmationDialog from "@/components/ConfirmationDialog";

const Roles: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.rolesPermissions.list");

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  const [summary, setSummary] = useState({
    totalRoles: 0,
    systemRoles: 0,
    customRoles: 0,
  });

  const [totalRecords, setTotalRecords] = useState(0);
  const [data, setData] = useState<RoleAccount[]>([]);

  // Confirmation dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleAccount | null>(null);

  const columns = [
    { key: "no", label: t("table.no"), visible: true },
    { key: "accountName", label: t("table.account"), visible: true },
    { key: "roleName", label: t("table.role"), type: "link" as const, visible: true },
    { key: "description", label: t("table.description"), visible: true },
    {
      key: "createdOn",
      label: t("table.createdAt"),
      visible: true,
      type: "date" as const,
    },
  ];

  const handleEdit = (row: RoleAccount) => {
    localStorage.setItem("accountId", String(row.accountId));
    setTimeout(() => {
      router.push(`/users/roles-permissions/${row.roleId}`);
    }, 500);
  };

  // Open confirmation dialog
  const handleDelete = (row: RoleAccount) => {
    setRoleToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  // Confirm deletion
  const confirmDelete = async () => {
    if (!roleToDelete) return;

    try {
      const response = await deleteRole(roleToDelete.roleId);

      if (response && response.statusCode === 200) {
        toast.success(response.message);
        fetchRoles();
      } else {
        toast.error(response.message || t("toast.deleteFailed"));
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error(t("toast.deleteError"));
    } finally {
      setRoleToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handlePageChange = (page: number) => setPageNo(page);
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNo(1);
  };

  const handleExport = async () => {
    try {
      await exportRoles();
      toast.success(t("toast.exportSuccess"));
    } catch {
      toast.error(t("toast.exportFailed"));
    }
  };

  async function fetchRoles() {
    const response = await getRoles(pageNo, pageSize, debouncedQuery);
    if (response && response.statusCode === 200) {
      setSummary(response.data.summary);
      setData(response.data.roles.items);
      setTotalRecords(response.data.roles.totalRecords);
    } else toast.error(response.message);
  }

  useEffect(() => {
    fetchRoles();
  }, [pageNo, pageSize, debouncedQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-2`}>
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          breadcrumbs={[{ label: t("breadcrumbs.users") }, { label: t("breadcrumbs.current") }]}
          showButton={true}
          buttonText={t("addButton")}
          buttonRoute="/users/roles-permissions/0"
          showExportButton={true}
          ExportbuttonText={t("export")}
          showWriteButton={true}
          onExportClick={handleExport}
        />

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            icon={Shield}
            label={t("metrics.totalRoles")}
            value={summary.totalRoles}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
            isDark={isDark}
          />
          <MetricCard
            icon={Lock}
            label={t("metrics.systemRoles")}
            value={summary.systemRoles}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
            isDark={isDark}
          />
          <MetricCard
            icon={UsersIcon}
            label={t("metrics.customRoles")}
            value={summary.customRoles}
            iconBgColor="bg-pink-100"
            iconColor="text-pink-600"
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
          rowsPerPageOptions={[2, 10, 25, 50, 100]}
          defaultRowsPerPage={10}
          pageNo={pageNo}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          totalRecords={totalRecords}
          onPageSizeChange={handlePageSizeChange}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isServerSide={true}
        />

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setRoleToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t("delete.title")}
          message={t("delete.message", { name: roleToDelete?.roleName || "" })}
          confirmText={t("delete.confirm")}
          cancelText={t("delete.cancel")}
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default Roles;
