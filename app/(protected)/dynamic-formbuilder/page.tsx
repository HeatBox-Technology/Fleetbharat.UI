"use client";

import { Box, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import { MetricCard } from "@/components/CommonCard";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import SearchableDropdown, {
  type SearchableOption,
} from "@/components/SearchableDropdown";
import { useTheme } from "@/context/ThemeContext";
import type { FormBuilderItem } from "@/interfaces/formBuilder.interface";
import type { FormMasterItem } from "@/interfaces/form.interface";
import { getFormBuilders, deleteFormBuilder } from "@/services/formBuilderService";
import { getAllForms } from "@/services/formService";
import { getStoredAccountId, getStoredUserId } from "@/utils/storage";

const DynamicFormBuilderListPage: React.FC = () => {
  const router = useRouter();
  const { isDark } = useTheme();
  const t = useTranslations("pages.dynamicFormBuilder.list");

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [rows, setRows] = useState<FormBuilderItem[]>([]);
  const [accountId, setAccountId] = useState(0);
  const [formOptions, setFormOptions] = useState<SearchableOption[]>([]);
  const [selectedFormOption, setSelectedFormOption] =
    useState<SearchableOption | null>(null);
  const [loadingForms, setLoadingForms] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<FormBuilderItem | null>(null);

  const columns = [
    { key: "no", label: t("table.no"), visible: true },
    {
      key: "formCode",
      label: t("table.formCode"),
      type: "link" as const,
      visible: true,
    },
    { key: "formTitle", label: t("table.formTitle"), visible: true },
    { key: "formName", label: t("table.baseForm"), visible: true },
    { key: "accountName", label: t("table.account"), visible: true },
    { key: "projectName", label: t("table.project"), visible: true },
    { key: "isActive", label: t("table.status"), type: "badge" as const, visible: true },
  ];

  const loadFormOptions = useCallback(async () => {
    try {
      setLoadingForms(true);
      const response = await getAllForms(1, 500, "");
      if (!(response?.success || response?.statusCode === 200)) {
        toast.error(response?.message || t("toast.loadFormsFailed"));
        return;
      }

      const items = Array.isArray(response?.data?.items)
        ? (response.data.items as FormMasterItem[])
        : [];

      setFormOptions([
        { label: t("filters.allForms"), value: 0 },
        ...items.map((item) => ({
          label: String(item.formName || item.formCode || `Form ${item.formId}`),
          value: Number(item.formId || 0),
          description: String(item.formCode || ""),
        })),
      ]);
    } catch {
      toast.error(t("toast.loadFormsFailed"));
    } finally {
      setLoadingForms(false);
    }
  }, [t]);

  const loadRows = useCallback(async () => {
    const resolvedAccountId = getStoredAccountId(accountId);
    if (resolvedAccountId <= 0) {
      setRows([]);
      setTotalRecords(0);
      return;
    }

    try {
      setLoading(true);
      const response: any = await getFormBuilders({
        accountId: resolvedAccountId,
        fkFormId: Number(selectedFormOption?.value || 0),
        search: debouncedQuery,
        pageNumber: pageNo,
        pageSize,
      });

      if (response?.success || response?.statusCode === 200) {
        setRows(response?.data?.items || []);
        setTotalRecords(Number(response?.data?.totalRecords || 0));
      } else {
        toast.error(response?.message || t("toast.loadBuildersFailed"));
      }
    } catch {
      toast.error(t("toast.loadBuildersFailed"));
    } finally {
      setLoading(false);
    }
  }, [accountId, debouncedQuery, pageNo, pageSize, selectedFormOption, t]);

  useEffect(() => {
    setAccountId(getStoredAccountId());
    void loadFormOptions();
  }, [loadFormOptions]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setPageNo(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const cards = useMemo(() => {
    const active = rows.filter((item) => item.isActive).length;
    const inactive = rows.filter((item) => !item.isActive).length;
    return {
      total: totalRecords,
      active,
      draft: 0,
      inactive,
    };
  }, [rows, totalRecords]);

  const handleDelete = async () => {
    if (!selectedRow) return;

    const deletedByUser = getStoredUserId();
    if (!deletedByUser) {
      toast.error(t("toast.missingUser"));
      return;
    }

    try {
      const response = await deleteFormBuilder(selectedRow.formBuilderId, {
        deletedByUser,
      });

      if (response?.success || response?.statusCode === 200) {
        toast.success(response?.message || t("toast.deleteSuccess"));
        setIsDeleteDialogOpen(false);
        setSelectedRow(null);
        await loadRows();
      } else {
        toast.error(response?.message || t("toast.deleteFailed"));
      }
    } catch {
      toast.error(t("toast.deleteFailed"));
    }
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <ActionLoader isVisible={loading} text={t("loading")} />
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-2`}>
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.platformTools") },
            { label: t("breadcrumbs.current") },
          ]}
          showButton
          buttonText={t("buttons.create")}
          buttonRoute="/dynamic-formbuilder/0"
          showExportButton={false}
          showFilterButton={false}
          showBulkUpload={false}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 my-4 sm:my-6">
          <MetricCard
            icon={Box}
            label={t("cards.total")}
            value={cards.total}
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600 dark:text-blue-400"
            isDark={isDark}
          />
          <MetricCard
            icon={CheckCircle2}
            label={t("cards.active")}
            value={cards.active}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            isDark={isDark}
          />
          <MetricCard
            icon={Clock3}
            label={t("cards.draft")}
            value={cards.draft}
            iconBgColor="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
            isDark={isDark}
          />
          <MetricCard
            icon={XCircle}
            label={t("cards.inactive")}
            value={cards.inactive}
            iconBgColor="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
            isDark={isDark}
          />
        </div>

        <div
          className={`rounded-2xl border p-4 mb-4 ${
            isDark ? "bg-card border-border" : "bg-white border-gray-200"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">
                {t("filters.form")}
              </label>
              <SearchableDropdown
                options={formOptions}
                value={selectedFormOption}
                onChange={(option) => {
                  setSelectedFormOption(option);
                  setPageNo(1);
                }}
                placeholder={t("filters.allForms")}
                isLoading={loadingForms}
                noOptionsMessage={t("filters.noForms")}
              />
            </div>
            <div
              className={`rounded-xl border px-4 py-3 ${
                isDark
                  ? "bg-gray-900/50 border-gray-700 text-gray-200"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              }`}
            >
              <p className="text-xs uppercase tracking-wide opacity-70 mb-1">
                {t("filters.accountScope")}
              </p>
              <p className="text-sm font-semibold">
                {accountId > 0
                  ? t("filters.accountId", { id: accountId })
                  : t("filters.noAccount")}
              </p>
            </div>
          </div>
        </div>

        <CommonTable
          columns={columns}
          data={rows}
          onEdit={(row) =>
            router.push(
              `/dynamic-formbuilder/${(row as FormBuilderItem).formBuilderId}`,
            )
          }
          onDelete={(row) => {
            setSelectedRow(row as FormBuilderItem);
            setIsDeleteDialogOpen(true);
          }}
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

        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSelectedRow(null);
          }}
          onConfirm={handleDelete}
          title={t("delete.title")}
          message={t("delete.message", { name: selectedRow?.formTitle || "" })}
          confirmText={t("delete.confirm")}
          cancelText={t("delete.cancel")}
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default DynamicFormBuilderListPage;
