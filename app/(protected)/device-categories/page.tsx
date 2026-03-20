"use client";

import { AlertCircle, Layers, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { MetricCard } from "@/components/CommonCard";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import { getFormRightForPath } from "@/services/commonServie";

interface DeviceCategoryRow {
  id: number;
  name: string;
  code: string;
  protocol: string;
  status: "Active" | "Inactive";
  updatedAt: string;
}

const STATIC_ROWS: DeviceCategoryRow[] = [
  {
    id: 1,
    name: "GPS Tracker",
    code: "GPS",
    protocol: "TCP",
    status: "Active",
    updatedAt: "2026-03-01T10:30:00.000Z",
  },
  {
    id: 2,
    name: "DMS Camera",
    code: "DMS",
    protocol: "HTTP",
    status: "Active",
    updatedAt: "2026-02-18T08:10:00.000Z",
  },
  {
    id: 3,
    name: "Temperature Sensor",
    code: "TEMP",
    protocol: "MQTT",
    status: "Inactive",
    updatedAt: "2026-01-25T16:45:00.000Z",
  },
  {
    id: 4,
    name: "Fuel Probe",
    code: "FUEL",
    protocol: "TCP",
    status: "Active",
    updatedAt: "2026-03-10T07:20:00.000Z",
  },
];

const DeviceCategoriesPage: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.deviceCategories.list");

  const pageRight = getFormRightForPath("/device-categories");
  const canRead = pageRight ? Boolean(pageRight.canRead) : true;
  const canWrite = pageRight ? Boolean(pageRight.canWrite) : true;
  const canUpdate = pageRight ? Boolean(pageRight.canUpdate) : true;
  const canDelete = pageRight ? Boolean(pageRight.canDelete) : true;

  const [rows, setRows] = useState<DeviceCategoryRow[]>(STATIC_ROWS);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<DeviceCategoryRow | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredRows = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) =>
      [row.name, row.code, row.protocol, row.status]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [rows, debouncedQuery]);

  const summary = useMemo(() => {
    const activeCount = rows.filter((row) => row.status === "Active").length;
    return {
      total: rows.length,
      active: activeCount,
      inactive: rows.length - activeCount,
    };
  }, [rows]);

  const columns = useMemo(
    () => [
      { key: "no", label: t("table.no"), visible: true },
      { key: "name", label: t("table.name"), visible: true },
      { key: "code", label: t("table.code"), visible: true },
      { key: "protocol", label: t("table.protocol"), visible: true },
      { key: "status", label: t("table.status"), type: "badge" as const, visible: true },
      {
        key: "updatedAt",
        label: t("table.updatedAt"),
        type: "date" as const,
        visible: true,
      },
    ],
    [t],
  );

  const handleEdit = (row: DeviceCategoryRow) => {
    router.push(`/device-categories/${row.id}`);
  };

  const handleDelete = (row: DeviceCategoryRow) => {
    setSelectedRow(row);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedRow) return;
    setRows((prev) => prev.filter((item) => item.id !== selectedRow.id));
    toast.success(t("toast.deleted"));
    setSelectedRow(null);
    setIsDeleteDialogOpen(false);
  };

  if (!canRead) {
    return (
      <div className={`${isDark ? "dark" : ""} mt-10`}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-foreground">{t("noReadPermission")}</p>
        </div>
      </div>
    );
  }

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
          buttonRoute="/device-categories/0"
          showWriteButton={canWrite}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            icon={Layers}
            label={t("metrics.total")}
            value={summary.total}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
            isDark={isDark}
          />
          <MetricCard
            icon={ShieldCheck}
            label={t("metrics.active")}
            value={summary.active}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
            isDark={isDark}
          />
          <MetricCard
            icon={AlertCircle}
            label={t("metrics.inactive")}
            value={summary.inactive}
            iconBgColor="bg-orange-100"
            iconColor="text-orange-600"
            isDark={isDark}
          />
        </div>

        <CommonTable
          columns={columns}
          data={filteredRows}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={canUpdate}
          canDelete={canDelete}
          showActions={true}
          searchPlaceholder={t("searchPlaceholder")}
          rowsPerPageOptions={[10, 25, 50, 100]}
          defaultRowsPerPage={10}
          pageNo={pageNo}
          pageSize={pageSize}
          onPageChange={setPageNo}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageNo(1);
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalRecords={filteredRows.length}
          isServerSide={false}
        />

        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSelectedRow(null);
          }}
          onConfirm={confirmDelete}
          title={t("delete.title")}
          message={t("delete.message", { name: selectedRow?.name || "" })}
          confirmText={t("delete.confirm")}
          cancelText={t("delete.cancel")}
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default DeviceCategoriesPage;
