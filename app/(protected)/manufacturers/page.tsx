"use client";

import React, { useEffect, useState } from "react";
import CommonTable from "@/components/CommonTable";
import ActionLoader from "@/components/ActionLoader";
import PageHeader from "@/components/PageHeader";
import { MetricCard } from "@/components/CommonCard";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useTheme } from "@/context/ThemeContext";
import { FormRights } from "@/interfaces/account.interface";
import {
  OemManufacturer,
  OemManufacturerCardCounts,
  OemManufacturerPageData,
  OemManufacturerRow,
} from "@/interfaces/oemManufacturers.interface";
import { CircleAlert, Database, Globe, Mail, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import {
  deleteOemManufacture,
  getOemManufacturers,
  updateOemManufactureStatus,
} from "@/services/oemManufacturersService";

const Manufacturers: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [manufacturersRight, setManufacturersRight] = useState<FormRights | null>(null);

  // Confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [manufacturerToDelete, setManufacturerToDelete] = useState<OemManufacturerRow | null>(
    null,
  );

  const [cardCounts, setCardCounts] = useState<OemManufacturerCardCounts>({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
  });

  const getWebsiteHref = (url?: string) => {
    const value = String(url || "").trim();
    if (!value) return "";
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  };

  const columns = [
    {
      key: "code",
      label: "CODE",
      type: "icon-text" as const,
      visible: true,
    },
    {
      key: "name",
      label: "NAME",
      visible: true,
    },
    {
      key: "reach",
      label: "REACH",
      render: (value: OemManufacturerRow["reach"]) => {
        const websiteHref = getWebsiteHref(value?.website);
        const supportEmail = String(value?.email || "").trim();
        const mailSubject = encodeURIComponent(
          "Support Request - OEM Manufacturer",
        );
        const mailBody = encodeURIComponent("Hi Team,");

        return (
          <div className="flex items-center gap-4">
            {websiteHref ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                title="Open Website"
                className="text-indigo-500 hover:text-indigo-600"
              >
                <Globe className="w-5 h-5" />
              </a>
            ) : (
              <span className="text-gray-400" title="Website not available">
                <Globe className="w-5 h-5" />
              </span>
            )}
            {supportEmail ? (
              <a
                href={`mailto:${supportEmail}?subject=${mailSubject}&body=${mailBody}`}
                title="Send Email"
                className="text-indigo-500 hover:text-indigo-600"
              >
                <Mail className="w-5 h-5" />
              </a>
            ) : (
              <span className="text-gray-400" title="Email not available">
                <Mail className="w-5 h-5" />
              </span>
            )}
          </div>
        );
      },
      visible: true,
    },
    {
      key: "status",
      label: "STATUS",
      type: "badge" as const,
      visible: true,
    },
     {
      key: "lastUpdated",
      label: "LAST UPDATED",
      visible: true,
    },

  ];

  const [data, setData] = useState<OemManufacturerRow[]>([]);

  const handleEdit = (row: OemManufacturerRow) => {
    router.push(`/manufacturers/${row.id}`);
  };

  // Show confirmation dialog instead of deleting directly
  const handleDelete = (row: OemManufacturerRow) => {
    setManufacturerToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  const handleStatusToggle = async (row: OemManufacturerRow) => {
    const response = await updateOemManufactureStatus(row.id, !row.status);
    if (response && [200, 204].includes(response.statusCode)) {
      toast.success(response.message || "Status updated successfully.");
      getManufacturersList();
    } else {
      toast.error(response?.message || "Failed to update status.");
    }
  };

  // Actual delete operation after confirmation
  const confirmDelete = async () => {
    if (!manufacturerToDelete) return;

    const response = await deleteOemManufacture(manufacturerToDelete.id);
    if (response && [200, 204].includes(response.statusCode)) {
      toast.success(response.message);
      if (pageNo > 1) setPageNo(1);
      else getManufacturersList();
    } else {
      toast.error(response?.message || "Failed to delete manufacturer.");
    }

    // Reset state
    setManufacturerToDelete(null);
  };

  const handlePageChange = (page: number) => {
    setPageNo(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNo(1);
  };

  async function getManufacturersList() {
    try {
      setLoading(true);
      const response = await getOemManufacturers(pageNo, pageSize, debouncedQuery);

      if (response && response.statusCode === 200) {
        const listData =
          response?.data?.pageData ||
          response?.data?.manufacturers ||
          response?.data ||
          ({} as OemManufacturerPageData);
        const items: OemManufacturer[] = Array.isArray(listData?.items)
          ? (listData.items as OemManufacturer[])
          : Array.isArray(response?.data?.items)
            ? (response.data.items as OemManufacturer[])
            : Array.isArray(response?.data)
              ? (response.data as OemManufacturer[])
              : [];

        const mappedRows: OemManufacturerRow[] = items.map((item) => ({
          id: item.id,
          code: item.code || "-",
          name: item.displayName || "-",
          reach: {
            website: item.officialWebsite || "",
            email: item.supportEmail || "",
          },
          status: Boolean(item.isEnabled),
          lastUpdated: item.updatedAt || item.createdAt || "",
        }));

        setData(mappedRows);
        setTotalRecords(
          Number(
            listData?.totalRecords ??
              response?.data?.totalRecords ??
              mappedRows.length,
          ),
        );
        setCardCounts(
          response?.data?.cardCounts || {
            total: mappedRows.length,
            active: mappedRows.filter((row) => row.status).length,
            pending: mappedRows.filter((row) => !row.status).length,
            inactive: mappedRows.filter((row) => !row.status).length,
          },
        );
      } else {
        toast.error(response?.message ?? "Failed to load manufacturers");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setPageNo(1);
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    getManufacturersList();
  }, [pageNo, pageSize, debouncedQuery]);

  useEffect(() => {
    function getPermissionsList() {
      if (typeof window === "undefined") return;

      try {
        const storedPermissions = localStorage.getItem("permissions");

        if (storedPermissions) {
          const parsedPermissions = JSON.parse(storedPermissions);
          const rights = parsedPermissions.find(
            (val: { formName?: string; pageUrl?: string }) =>
              val.formName?.toLowerCase().includes("manufacturer") ||
              val.pageUrl === "/manufacturers",
          );

          if (rights) {
            setManufacturersRight(rights);
          } else {
            console.warn('No matching rights found for "Manufacturers".');
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
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-2 sm:p-0 md:p-2`}
      >
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <PageHeader
            title="Manufacturers"
            subtitle="Enterprise global registry management for SaaS scalability."
            breadcrumbs={[{ label: "Master Data" }, { label: "Manufacturers" }]}
            showButton={true}
            buttonText="Add New Manufacturer"
            buttonRoute="/manufacturers/0"
            showWriteButton={manufacturersRight?.canWrite || false}
          />
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <MetricCard
            icon={Database}
            label="TOTAL ENITIES"
            value={cardCounts.total}
            iconBgColor="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            isDark={isDark}
          />
          <MetricCard
            icon={ShieldCheck}
            label="STATUS: ENABLED"
            value={cardCounts.active}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            isDark={isDark}
          />
          <MetricCard
            icon={CircleAlert}
            label="STATUS: DISABLED"
            value={cardCounts.pending}
            iconBgColor="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
            isDark={isDark}
          />
        </div>

        {/* Table Section */}
        <div className="w-full">
          <ActionLoader isVisible={loading} text="Loading manufacturers..." />
          <CommonTable
            columns={columns}
            data={data}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusToggle={handleStatusToggle}
            showActions={true}
            searchPlaceholder="Search..."
            rowsPerPageOptions={[2, 4, 5, 10, 25, 50, 100]}
            defaultRowsPerPage={10}
            pageNo={pageNo}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalRecords={totalRecords}
          />
        </div>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setManufacturerToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Manufacturer"
          message={`Are you sure you want to delete "${manufacturerToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default Manufacturers;
