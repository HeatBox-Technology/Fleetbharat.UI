"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "@/context/ThemeContext";
import { Users, Truck, Clock, AlertCircle, MapPin } from "lucide-react";
import { toast } from "react-toastify";

import PageHeader from "@/components/PageHeader";
import { MetricCard } from "@/components/CommonCard";
import CommonTable from "@/components/CommonTable";
import ActionLoader from "@/components/ActionLoader";
import ConfirmationDialog from "@/components/ConfirmationDialog";

// Mock Service - Replace with actual imports
import { getDriverAssignments, deleteAssignment } from "@/services/driverAssignmentService";

const DriverAssignments: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.fleet.assignments");
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [metrics, setMetrics] = useState({
    total: 0, active: 0, temporary: 0, expired: 0
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
    //   const res = await getDriverAssignments(pageNo, pageSize, searchQuery);
        const res = await getDriverAssignments(pageNo, pageSize, searchQuery);

      if (res?.statusCode === 200) {
        setData(res.data.items);
        setTotalRecords(res.data.totalRecords);
        setMetrics(res.data.metrics);
      }
    } catch (error) {
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [pageNo, pageSize, searchQuery]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const columns = [
    {
      key: "driverName",
      label: "ASSIGNED PERSONNEL",
      visible: true,
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'}`}>
            {row.driverName.charAt(0)}
          </div>
          <div>
            <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{row.driverName}</div>
            <div className="text-xs text-gray-500">{row.driverCode}</div>
          </div>
        </div>
      )
    },
    {
      key: "vehiclePlate",
      label: "VEHICLE PLATE",
      type: "icon-text" as const,
      icon: <Truck className="w-4 h-4" />,
      visible: true,
    },
    {
      key: "basis",
      label: "BASIS",
      type: "badge" as const,
      visible: true,
      render: (val: string) => (
        <span className={`px-3 py-1 rounded text-[10px] font-bold ${val === 'PRIMARY' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
          {val}
        </span>
      )
    },
    {
      key: "operationalWindow",
      label: "OPERATIONAL WINDOW",
      visible: true,
      render: (_: any, row: any) => (
        <div className="text-xs">
          <div className="text-gray-500">From: {row.startTime}</div>
          <div className="text-green-500 font-medium">To: {row.endTime || 'Open / Active'}</div>
        </div>
      )
    }
  ];

  return (
    <div className={`${isDark ? "dark" : ""} mt-10 p-6`}>
      <ActionLoader isVisible={loading} text="Fetching assignments..." />
      
      <PageHeader
        title="Driver Assignments"
        subtitle="Map personnel to fleet assets for trip attribution"
        breadcrumbs={[
          { label: "Fleet" },
          { label: "Assignments" },
          { label: "Driver Assignments" },
        ]}
        showButton
        buttonText="Assign Driver"
        buttonRoute="/driver-assignment/0"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
        <MetricCard icon={Users} label="Total Assignments" value={metrics.total} isDark={isDark} iconBgColor="bg-blue-100" iconColor="text-blue-600" />
        <MetricCard icon={Truck} label="Active Primary" value={metrics.active} isDark={isDark} iconBgColor="bg-purple-100" iconColor="text-purple-600" />
        <MetricCard icon={Clock} label="Temporary" value={metrics.temporary} isDark={isDark} iconBgColor="bg-orange-100" iconColor="text-orange-600" />
        <MetricCard icon={AlertCircle} label="Expired" value={metrics.expired} isDark={isDark} iconBgColor="bg-red-100" iconColor="text-red-600" />
      </div>

      <CommonTable
        columns={columns}
        data={data}
        totalRecords={totalRecords}
        pageNo={pageNo}
        pageSize={pageSize}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onPageChange={setPageNo}
        onPageSizeChange={setPageSize}
        onEdit={(row) => router.push(`/fleet/assignments/${row.assignmentId}`)}
        onDelete={(row) => { setSelectedItem(row); setIsDeleteDialogOpen(true); }}
        showActions
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={async () => {
          await deleteAssignment(selectedItem.assignmentId);
          fetchList();
          setIsDeleteDialogOpen(false);
        }}
        title="Remove Assignment"
        message={`Are you sure you want to remove the assignment for ${selectedItem?.driverName}?`}
        type="danger"
        isDark={isDark}
      />
    </div>
  );
};

export default DriverAssignments;