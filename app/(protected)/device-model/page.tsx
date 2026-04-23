"use client";

import { CircleAlert, Database, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";

import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import { getDeviceModels, deleteDeviceModel, updateDeviceModelStatus } from "@/services/deviceModelService";
import { MetricCard } from "@/components/CommonCard";

const DeviceModelsList = () => {
    const { isDark } = useTheme();
    const router = useRouter();
    const [pageNo, setPageNo] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [data, setData] = useState([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [cardCounts, setCardCounts] = useState({ total: 0, enabled: 0, disabled: 0 });

    const columns = [
        { key: "code", label: "CODE", type: "icon-text" as const, visible: true },
        { key: "name", label: "NAME", visible: true },
        { key: "manufacturer", label: "MANUFACTURER", visible: true },
        { key: "category", label: "CATEGORY", visible: true },
        { key: "protocol", label: "PROTOCOL", type: "badge" as const, visible: true },
        { key: "status", label: "STATUS", type: "badge" as const, visible: true },
        { key: "lastUpdated", label: "LAST UPDATED", visible: true },
    ];

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getDeviceModels(pageNo, pageSize, searchQuery);
            if (res.success) {
                const items = res.data.models.items || [];
                setData(items.map((i: any) => ({
                    id: i.id,
                    code: i.code,
                    name: i.displayName,
                    manufacturer: i.manufacturerName,
                    category: i.deviceCategoryName,
                    protocol: i.protocolType,
                    status: i.isEnabled,
                    lastUpdated: i.updatedAt || i.createdAt,
                })));
                setTotalRecords(res.data.models.totalRecords);
                setCardCounts({
                    total: res.data.summary.totalEntities,
                    enabled: res.data.summary.enabled,
                    disabled: res.data.summary.disabled,
                });
            }
        } finally {
            setLoading(false);
        }
    }, [pageNo, pageSize, searchQuery]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleStatusToggle = async (row: any) => {
        const res = await updateDeviceModelStatus(row.id, !row.status);
        if (res.success) { toast.success("Status updated"); fetchData(); }
    };

    const confirmDelete = async () => {
        const res = await deleteDeviceModel(selectedItem.id);
        if (res.success) { toast.success("Deleted successfully"); setIsDeleteDialogOpen(false); fetchData(); }
    };

    return (
        <div className={`${isDark ? "dark" : ""} mt-10 p-4`}>
            <PageHeader
                title="Master Data Forge"
                subtitle="Enterprise global registry management for SaaS scalability."
                buttonText="Add New Master Data"
                buttonRoute="/device-model/0"
                showButton={true}
            />


            {/* Metric Cards Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
                <MetricCard
                    icon={Database}
                    label="TOTAL ENTITIES"
                    value={cardCounts.total}
                    iconBgColor="bg-purple-100 dark:bg-purple-900/30"
                    iconColor="text-purple-600 dark:text-purple-400"
                    isDark={isDark}
                />
                <MetricCard
                    icon={ShieldCheck}
                    label="STATUS: ENABLED"
                    value={cardCounts.enabled}
                    iconBgColor="bg-green-100 dark:bg-green-900/30"
                    iconColor="text-green-600 dark:text-green-400"
                    isDark={isDark}
                />
                <MetricCard
                    icon={CircleAlert}
                    label="STATUS: DISABLED"
                    value={cardCounts.disabled}
                    iconBgColor="bg-red-100 dark:bg-red-900/30"
                    iconColor="text-red-600 dark:text-red-400"
                    isDark={isDark}
                />
            </div>


            <ActionLoader isVisible={loading} />
            <CommonTable
                columns={columns}
                data={data}
                totalRecords={totalRecords}
                pageNo={pageNo}
                pageSize={pageSize}
                onPageChange={setPageNo}
                onPageSizeChange={setPageSize}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onEdit={(row) => router.push(`/device-model/${row.id}`)}
                onDelete={(row) => { setSelectedItem(row); setIsDeleteDialogOpen(true); }}
                onStatusToggle={handleStatusToggle}
                showActions={true}
            />

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Device Model"
                message="Are you sure you want to delete this record?"
                type="danger"
            />
        </div>
    );
};

export default DeviceModelsList;