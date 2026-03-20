"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import CommonTable from "@/components/CommonTable";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import PageHeader from "@/components/PageHeader";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useTheme } from "@/context/ThemeContext";
import { getCategories, deleteCategory } from "@/services/categoryService";
import { Category } from "@/interfaces/category.interface";
import { useRouter } from "next/navigation";
import { FormRights } from "@/interfaces/account.interface";
import { toast } from "react-toastify";

const Categories: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.categories.list");
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [categoryRights, setCategoryRights] = useState<FormRights | null>(null);

  // Confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );

  const columns = [
    {
      key: "categoryId",
      label: t("table.id"),
      visible: true,
    },
    {
      key: "labelName",
      label: t("table.label"),
      visible: true,
    },
    {
      key: "description",
      label: t("table.description"),
      visible: true,
    },
    {
      key: "isActive",
      label: t("table.status"),
      type: "badge" as const,
      visible: true,
    },
    {
      key: "createdAt",
      label: t("table.createdAt"),
      visible: true,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  const fetchCategories = async () => {
    try {
      if (isInitialLoad) setLoading(true);
      const response = await getCategories(pageNo, pageSize, debouncedQuery);
      if (response.success) {
        const pageData = response.data;
        const items = Array.isArray(pageData)
          ? pageData
          : pageData?.items || pageData?.data || [];

        setCategories(items);
        setTotalRecords(
          Array.isArray(pageData)
            ? pageData.length
            : pageData?.totalRecords || items.length,
        );
      } else {
        console.error("Failed to fetch categories:", response.message);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  const handleEdit = (row: Category) => {
    router.push(`/categories/${row.categoryId}`);
  };

  // Show confirmation dialog instead of browser confirm
  const handleDelete = (row: Category) => {
    setCategoryToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  // Actual delete operation after confirmation
  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await deleteCategory(categoryToDelete.categoryId);
      if (response.success) {
        toast.success(t("toast.deleted"));
        fetchCategories(); // Refresh list
      } else {
        toast.error(t("toast.deleteFailed", { message: response.message }));
      }
    } catch (error) {
      toast.error(t("toast.deleteError"));
      console.error("Error deleting category:", error);
    } finally {
      setCategoryToDelete(null);
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
    fetchCategories();
  }, [pageNo, pageSize, debouncedQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

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
            { label: t("breadcrumbs.accounts") },
            { label: t("breadcrumbs.current") },
          ]}
          showButton={true}
          buttonText={t("addButton")}
          buttonRoute="/categories/0"
          showWriteButton={categoryRights?.canWrite || false}
        />

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
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
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
          title={t("delete.title")}
          message={t("delete.message", {
            label: categoryToDelete?.labelName || "",
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

export default Categories;
