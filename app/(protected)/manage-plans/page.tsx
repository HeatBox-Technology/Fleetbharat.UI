"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import CommonTable from "@/components/CommonTable";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import PageHeader from "@/components/PageHeader";
import { MetricCard } from "@/components/CommonCard";
import { useTheme } from "@/context/ThemeContext";
import {
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
} from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { PlanData } from "@/interfaces/plan.interface";
import { deletePlan, getPlans } from "@/services/planService";

const ManagePlans: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.managePlans.list");
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  const columns = [
    {
      key: "no",
      label: t("table.no"),
      visible: true,
    },
    {
      key: "planName",
      label: t("table.planName"),
      type: "link" as const,
      visible: true,
    },
    {
      key: "tenantCategory",
      label: t("table.category"),
      visible: true,
    },
    {
      key: "initialBasePrice",
      label: t("table.pricing"),
      icon: <DollarSign className="w-4 h-4" />,
      visible: true,
    },
    // {
    //   key: "userLimit",
    //   label: "USER LIMIT",
    //   visible: true,
    // },
    {
      key: "isActive",
      label: t("table.status"),
      type: "badge" as const,
      visible: true,
    },
  ];

  // Mock data based on the screenshot
  const [data, setData] = useState<PlanData[]>([]);

  const handleEdit = (row: PlanData) => {
    router.push(`/manage-plans/${row.planId}`);
  };

  const handleDelete = async (row: PlanData) => {
    try {
      const response = await deletePlan(row.planId);
      if (response && response.statusCode === 200) {
        toast.success(response.message);
        getPlansList();
      } else {
        toast.error(response.message || t("toast.genericError"));
      }
    } catch (error) {
      toast.error(t("toast.deleteFailed"));
    }
  };

  const handlePageChange = (page: number) => {
    setPageNo(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNo(1);
  };

  async function getPlansList() {
    try {
      const response = await getPlans(pageNo, pageSize, debouncedQuery);
      if (response && response.statusCode === 200) {
        const items = Array.isArray(response?.data?.items)
          ? response.data.items
          : [];
        const mapped = items.map((item: any, index: number) => ({
          planId: String(item?.id || 0),
          no: (pageNo - 1) * pageSize + index + 1,
          planName: String(item?.planName || "-"),
          tenantCategory: String(item?.pricingModel || "-"),
          initialBasePrice: `₹${Number(item?.baseRate || 0).toLocaleString("en-IN")}`,
          isActive: String(item?.planStatus || "Inactive"),
        }));
        setData(mapped);
      }

      // Mock data for now
    } catch (error) {
      toast.error(t("toast.fetchFailed"));
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    getPlansList();
  }, [pageNo, pageSize, debouncedQuery]);

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-2 sm:p-0 md:p-2`}
      >
        {/* Page Header - Mobile Optimized */}
        <div className="mb-4 sm:mb-6">
          <PageHeader
            title={t("title")}
            subtitle={t("subtitle")}
            breadcrumbs={[{ label: t("breadcrumbs.billing") }, { label: t("breadcrumbs.current") }]}
            showButton={true}
            buttonText={t("addButton")}
            buttonRoute="/manage-plans/0"
          />
        </div>

        {/* Metric Cards - Truly Mobile Responsive */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <MetricCard
            icon={CreditCard}
            label="TOTAL PLANS"
            value={4}
            iconBgColor="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            isDark={isDark}
          />
          <MetricCard
            icon={CheckCircle}
            label="ACTIVE"
            value={4}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            isDark={isDark}
          />
          <MetricCard
            icon={Clock}
            label="TRIAL"
            value={1}
            iconBgColor="bg-orange-100 dark:bg-orange-900/30"
            iconColor="text-orange-600 dark:text-orange-400"
            isDark={isDark}
          />
          <MetricCard
            icon={XCircle}
            label="INACTIVE"
            value={0}
            iconBgColor="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
            isDark={isDark}
          />
        </div> */}

        {/* Table Section - Mobile Optimized */}
        <div className="w-full">
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
            onPageSizeChange={handlePageSizeChange}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>
      </div>
    </div>
  );
};

export default ManagePlans;
