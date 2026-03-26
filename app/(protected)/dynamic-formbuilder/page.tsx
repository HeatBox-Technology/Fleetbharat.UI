"use client";

import { Box, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { MetricCard } from "@/components/CommonCard";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";

const DYNAMIC_FORMS_STORAGE_KEY = "mock_dynamic_form_builders";

interface StaticDynamicFormItem {
  formId: number;
  formCode: string;
  formName: string;
  moduleName: string;
  pageUrl: string;
  isActive: boolean;
  filterConfigJson: string;
  createdAt: string;
  updatedAt: string;
}

interface TableDynamicFormItem extends StaticDynamicFormItem {
  accountName: string;
}

const parseStoredForms = (): StaticDynamicFormItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(DYNAMIC_FORMS_STORAGE_KEY) || "[]";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StaticDynamicFormItem[];
  } catch {
    return [];
  }
};

const DynamicFormBuilderListPage: React.FC = () => {
  const router = useRouter();
  const { isDark } = useTheme();

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [allRows, setAllRows] = useState<TableDynamicFormItem[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TableDynamicFormItem | null>(
    null,
  );

  const columns = [
    { key: "no", label: "NO", visible: true },
    {
      key: "formCode",
      label: "FORM CODE",
      type: "link" as const,
      visible: true,
    },
    { key: "formName", label: "FORM TITLE", visible: true },
    { key: "accountName", label: "ACCOUNT", visible: true },
    { key: "moduleName", label: "MODULE", visible: true },
    { key: "isActive", label: "STATUS", type: "badge" as const, visible: true },
  ];

  const loadRows = useCallback(() => {
    setLoading(true);
    const stored = parseStoredForms().filter(
      (item) =>
        String(item.pageUrl || "").toLowerCase() === "/dynamic-formbuilder",
    );

    const mapped: TableDynamicFormItem[] = stored.map((item) => {
      let accountName = "-";
      try {
        const schema = JSON.parse(String(item.filterConfigJson || "{}")) as {
          accountName?: string;
        };
        accountName = String(schema.accountName || "-");
      } catch {
        accountName = "-";
      }

      return {
        ...item,
        accountName,
      };
    });

    mapped.sort((a, b) => b.formId - a.formId);
    setAllRows(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
      setPageNo(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredRows = useMemo(() => {
    if (!debouncedQuery) return allRows;
    return allRows.filter((item) => {
      const haystack =
        `${item.formCode} ${item.formName} ${item.accountName}`.toLowerCase();
      return haystack.includes(debouncedQuery);
    });
  }, [allRows, debouncedQuery]);

  const pagedRows = useMemo(() => {
    const start = (pageNo - 1) * pageSize;
    const end = start + pageSize;
    return filteredRows.slice(start, end);
  }, [filteredRows, pageNo, pageSize]);

  const cards = useMemo(() => {
    const active = allRows.filter((item) => item.isActive).length;
    const inactive = allRows.filter((item) => !item.isActive).length;
    return {
      total: allRows.length,
      active,
      draft: 0,
      inactive,
    };
  }, [allRows]);

  const handleDelete = () => {
    if (!selectedRow) return;

    const next = parseStoredForms().filter(
      (item) => item.formId !== selectedRow.formId,
    );
    localStorage.setItem(DYNAMIC_FORMS_STORAGE_KEY, JSON.stringify(next));
    toast.success("Dynamic form deleted successfully");
    setIsDeleteDialogOpen(false);
    setSelectedRow(null);
    loadRows();
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-2`}>
        <PageHeader
          title="Dynamic Form Builder"
          subtitle="Create and manage account-scoped dynamic form schemas."
          breadcrumbs={[
            { label: "Platform & Tools" },
            { label: "Dynamic Form Builder" },
          ]}
          showButton
          buttonText="Create Builder"
          buttonRoute="/dynamic-formbuilder/0"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 my-4 sm:my-6">
          <MetricCard
            icon={Box}
            label="Total Builders"
            value={cards.total}
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600 dark:text-blue-400"
            isDark={isDark}
          />
          <MetricCard
            icon={CheckCircle2}
            label="Active"
            value={cards.active}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            isDark={isDark}
          />
          <MetricCard
            icon={Clock3}
            label="Draft"
            value={cards.draft}
            iconBgColor="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
            isDark={isDark}
          />
          <MetricCard
            icon={XCircle}
            label="Inactive"
            value={cards.inactive}
            iconBgColor="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
            isDark={isDark}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <p className={isDark ? "text-gray-300" : "text-gray-700"}>
              Loading dynamic form builders...
            </p>
          </div>
        ) : (
          <CommonTable
            columns={columns}
            data={pagedRows}
            onEdit={(row) =>
              router.push(
                `/dynamic-formbuilder/${(row as TableDynamicFormItem).formId}`,
              )
            }
            onDelete={(row) => {
              setSelectedRow(row as TableDynamicFormItem);
              setIsDeleteDialogOpen(true);
            }}
            showActions={true}
            searchPlaceholder="Search by title or form code..."
            rowsPerPageOptions={[10, 25, 50, 100]}
            defaultRowsPerPage={10}
            pageNo={pageNo}
            pageSize={pageSize}
            onPageChange={setPageNo}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageNo(1);
            }}
            totalRecords={filteredRows.length}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSelectedRow(null);
          }}
          onConfirm={handleDelete}
          title="Delete Dynamic Form"
          message={`Are you sure you want to delete "${selectedRow?.formName || ""}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default DynamicFormBuilderListPage;
