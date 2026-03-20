"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import CommonTable from "@/components/CommonTable";
import PageHeader from "@/components/PageHeader";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useTheme } from "@/context/ThemeContext";
import { deleteForm, getAllForms } from "@/services/formService";
import { FormMasterItem } from "@/interfaces/form.interface";

const FormMasterPage: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.formmaster.list");

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [forms, setForms] = useState<FormMasterItem[]>([]);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<FormMasterItem | null>(null);

  const columns = [
    { key: "no", label: t("table.no"), visible: true },
    {
      key: "formCode",
      label: t("table.formCode"),
      type: "link" as const,
      visible: true,
    },
    { key: "formName", label: t("table.formName"), visible: true },
    { key: "moduleName", label: t("table.module"), visible: true },
    { key: "pageUrl", label: t("table.pageUrl"), visible: true },
    {
      key: "isActive",
      label: t("table.status"),
      type: "badge" as const,
      visible: true,
    },
  ];

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await getAllForms(pageNo, pageSize, debouncedQuery);
      if (response?.success) {
        setForms(response.data?.items || []);
        setTotalRecords(response.data?.totalRecords || 0);
      } else {
        toast.error(response?.message || t("toast.fetchFailed"));
      }
    } catch (error) {
      toast.error(t("toast.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (row: FormMasterItem) => {
    router.push(`/formmaster/${row.formId}`);
  };

  const handleDeleteClick = (row: FormMasterItem) => {
    setFormToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!formToDelete) return;

    try {
      const response = await deleteForm(formToDelete.formId);
      if (response?.success || response?.statusCode === 200) {
        toast.success(response?.message || t("toast.deleted"));
        fetchForms();
      } else {
        toast.error(response?.message || t("toast.deleteFailed"));
      }
    } catch (error) {
      toast.error(t("toast.deleteFailed"));
    } finally {
      setFormToDelete(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPageNo(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchForms();
  }, [pageNo, pageSize, debouncedQuery]);

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-2`}>
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.configurations") },
            { label: t("breadcrumbs.current") },
          ]}
          showButton={true}
          buttonText={t("addButton")}
          buttonRoute="/formmaster/0"
        />

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <p className={isDark ? "text-gray-300" : "text-gray-700"}>
              {t("loading")}
            </p>
          </div>
        ) : (
          <CommonTable
            columns={columns}
            data={forms}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
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
            totalRecords={totalRecords}
            isServerSide={true}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setFormToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title={t("delete.title")}
          message={t("delete.message", { name: formToDelete?.formName || "" })}
          confirmText={t("delete.confirm")}
          cancelText={t("delete.cancel")}
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default FormMasterPage;
