"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import { Configuration } from "@/interfaces/configuartion.interface";
import {
  deleteConfiguration,
  getConfigurations,
} from "@/services/configurationService";

const ConfigurationPage: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.configuration.list");

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);

  // Confirmation dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<Configuration | null>(
    null,
  );

  const columns = [
    { key: "accountConfigurationId", label: t("table.id"), visible: true },
    { key: "accountName", label: t("table.account"), visible: true },
    { key: "mapProvider", label: t("table.mapProvider"), visible: true },
    { key: "dateFormat", label: t("table.dateFormat"), visible: true },
    { key: "defaultLanguage", label: t("table.language"), visible: true },
    {
      key: "updatedOn",
      label: t("table.lastUpdated"),
      visible: true,
      type: "date" as const,
    },
  ];

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const response = await getConfigurations(pageNo, pageSize, debouncedQuery);
      if (response.success) {
        setConfigurations(response.data?.items || []);
        setTotalRecords(response.data?.totalRecords || 0);
      } else {
        console.error("Failed to fetch configurations:", response.message);
      }
    } catch (error) {
      console.error("Error fetching configurations:", error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  const handleEdit = (row: Configuration) => {
    router.push(`/configuration/${row.accountConfigurationId}`);
  };

  // Open confirmation dialog
  const handleDelete = (row: Configuration) => {
    setConfigToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  // Confirm deletion
  const confirmDelete = async () => {
    if (!configToDelete) return;

    try {
      const response = await deleteConfiguration(
        configToDelete.accountConfigurationId,
      );
      if (response.success) {
        toast.success(t("toast.deleted"));
        fetchConfigurations();
      } else {
        toast.error(t("toast.deleteFailed", { message: response.message }));
      }
    } catch (error) {
      toast.error(t("toast.deleteError"));
      console.error("Error deleting configuration:", error);
    } finally {
      setConfigToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handlePageChange = (page: number) => setPageNo(page);
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNo(1);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetchConfigurations();
  }, [pageNo, pageSize, debouncedQuery]);

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader isVisible={loading} text="Loading configurations..." />
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-2`}>
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.accounts") },
            { label: t("breadcrumbs.current") },
          ]}
          showButton={true}
          buttonText={t("addButton")}
          buttonRoute="/configuration/0"
        />

        <CommonTable
          columns={columns}
          data={configurations}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showActions={true}
          searchPlaceholder={t("searchPlaceholder")}
          rowsPerPageOptions={[10, 25, 50, 100]}
          defaultRowsPerPage={10}
          pageNo={pageNo}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalRecords={totalRecords}
        />

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setConfigToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t("delete.title")}
          message={t("delete.message", {
            account: configToDelete?.accountName || "",
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

export default ConfigurationPage;
