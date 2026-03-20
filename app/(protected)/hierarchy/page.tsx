"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { useTheme } from "@/context/ThemeContext";
import HierarchicalTable from "@/components/HierarchicalTable";
import PageHeader from "@/components/PageHeader";
import type { HierarchyNode } from "@/interfaces/table.interface";
import { getAccountHierarchy } from "@/services/accountService";

interface AccountHierarchyApiNode {
  accountId?: number;
  accountName?: string;
  accountCode?: string;
  categoryName?: string;
  status?: boolean;
  children?: AccountHierarchyApiNode[];
}

const TYPE_BY_LEVEL = [
  "DISTRIBUTOR",
  "ENTERPRISE",
  "DEALER",
  "SUB ACCOUNT",
] as const;

const toHierarchyNodes = (
  nodes: AccountHierarchyApiNode[],
  level = 0,
): HierarchyNode[] => {
  if (!Array.isArray(nodes)) return [];

  return nodes.map((node, index) => {
    const id = String(node?.accountId || `${level}-${index}`);
    const name = String(node?.accountName || "Unknown Account");
    const code = String(node?.accountCode || `ACC-${id}`);
    const children = toHierarchyNodes(node?.children || [], level + 1);

    return {
      id,
      name,
      type: String(
        node?.categoryName ||
          TYPE_BY_LEVEL[Math.min(level, TYPE_BY_LEVEL.length - 1)],
      ),
      code,
      status: node?.status ? "Active" : "Suspended",
      managed: `${children.length} Child ${children.length === 1 ? "Account" : "Accounts"}`,
      avatar: name
        .split(" ")
        .filter(Boolean)
        .map((item) => item[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      avatarColor: level % 2 === 0 ? "#8b5cf6" : "#64748b",
      children,
    };
  });
};

const Hierarchy: React.FC = () => {
  const t = useTranslations("pages.hierarchy");
  const { isDark } = useTheme();
  const router = useRouter();
  const [hierarchyData, setHierarchyData] = useState<HierarchyNode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        setLoading(true);
        const response = await getAccountHierarchy();
        const raw = Array.isArray(response?.rawHierarchy)
          ? response.rawHierarchy
          : [];
        setHierarchyData(toHierarchyNodes(raw));
      } catch (error) {
        console.error("Error fetching account hierarchy:", error);
        toast.error(t("toast.fetchFailed"));
        setHierarchyData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHierarchy();
  }, []);

  const handleEdit = (node: HierarchyNode) => {
    const accountId = String(node?.id || "").trim();
    if (!accountId) return;
    router.push(`/accounts/${accountId}`);
  };

  return (
    <div className={`${isDark ? "dark" : ""}`}>
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-6`}
      >
        <div className="max-w-7xl mx-auto mb-6">
          <PageHeader
            title={t("title")}
            subtitle={t("subtitle")}
            breadcrumbs={[
              { label: t("breadcrumbs.accounts") },
              { label: t("breadcrumbs.current") },
            ]}
            showButton={false}
            showBulkUpload={false}
          />
        </div>

        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <p>{t("loading")}</p>
            </div>
          ) : (
            <HierarchicalTable
              title={t("table.title")}
              subtitle={t("table.subtitle")}
              data={hierarchyData}
              onEdit={handleEdit}
              showSearch={true}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Hierarchy;
