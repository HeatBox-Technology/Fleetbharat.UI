"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import CommonTable from "@/components/CommonTable";
import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { getWhiteLabels, deleteWhiteLabel } from "@/services/whitelabelService";
import { WhiteLabel } from "@/interfaces/whitelabel.interface";
import { toast } from "react-toastify";

const WhiteLabelPage: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.whiteLabel.list");

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [data, setData] = useState<WhiteLabel[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Confirmation dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [whiteLabelToDelete, setWhiteLabelToDelete] =
    useState<WhiteLabel | null>(null);

  const columns = [
    {
      key: "accountName",
      label: t("table.account"),
      visible: true,
    },
    {
      key: "customEntryFqdn",
      label: t("table.domain"),
      type: "link" as const,
      visible: true,
    },
    {
      key: "theme",
      label: t("table.theme"),
      visible: true,
      render: (value: any, row: WhiteLabel) => (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full border"
            style={{ backgroundColor: row.primaryColorHex }}
            title={row.primaryColorHex}
          />
          <div
            className="w-6 h-6 rounded-full border"
            style={{ backgroundColor: row.secondaryColorHex }}
            title={row.secondaryColorHex}
          />
        </div>
      ),
    },
    {
      key: "isActive",
      label: t("table.status"),
      type: "badge" as const,
      visible: true,
    },
  ];

  // Fetch White Labels Data
  const fetchWhiteLabels = async () => {
    try {
      setLoading(true);
      const response = await getWhiteLabels(pageNo, pageSize, debouncedQuery);

      if (response.success && response.data) {
        setData(response.data.items || []);
        setTotalRecords(response.data.totalRecords || 0);
      } else {
        console.error("Failed to fetch white labels:", response.message);
        setData([]);
      }
    } catch (error) {
      console.error("Error fetching white labels:", error);
      setData([]);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchWhiteLabels();
  }, [pageNo, pageSize, debouncedQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleEdit = (row: WhiteLabel) => {
    router.push(`/whiteLabel/${row.whiteLabelId}`);
  };

  // Open confirmation dialog
  const handleDelete = (row: WhiteLabel) => {
    setWhiteLabelToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!whiteLabelToDelete) return;

    try {
      const response = await deleteWhiteLabel(whiteLabelToDelete.whiteLabelId);
      if (response.success) {
        toast.success(t("toast.deleted"));
        fetchWhiteLabels();
      } else {
        toast.error(response.message || t("toast.deleteFailed"));
      }
    } catch (error) {
      console.error("Error deleting white label:", error);
      toast.error(t("toast.deleteError"));
    } finally {
      setWhiteLabelToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handlePageChange = (page: number) => setPageNo(page);
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNo(1);
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader isVisible={loading} text="Loading white labels..." />
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
          buttonRoute="/whiteLabel/0"
        />

        {/* Table */}
        <CommonTable
          columns={columns}
          data={data}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showActions={true}
          searchPlaceholder={t("searchPlaceholder")}
          rowsPerPageOptions={[10, 25, 50, 100]}
          defaultRowsPerPage={10}
          variant="simple"
          pageNo={pageNo}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setWhiteLabelToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t("delete.title")}
          message={t("delete.message", {
            account: whiteLabelToDelete?.accountName || "",
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

export default WhiteLabelPage;
