"use client";

import { AlertCircle, Clock, Truck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import ActionLoader from "@/components/ActionLoader";
import { MetricCard } from "@/components/CommonCard";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";

import {
  deleteAssignment,
  getDriverAssignments,
} from "@/services/driverAssignmentService";

type AssignmentMetric = {
  total: number;
  active: number;
  temporary: number;
  expired: number;
};

type AssignmentRow = {
  assignmentId: number;
  driverName?: string;
  vehiclePlate?: string;
  basis?: string;
  startTime?: string;
  expectedEnd?: string;
};

const defaultMetrics: AssignmentMetric = {
  total: 0,
  active: 0,
  temporary: 0,
  expired: 0,
};

const DriverAssignments: React.FC = () => {
  const { isDark } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AssignmentRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AssignmentRow | null>(null);
  const [metrics, setMetrics] = useState<AssignmentMetric>(defaultMetrics);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDriverAssignments(pageNo, pageSize, searchQuery);

      if (res?.statusCode === 200 || res?.success) {
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        setData(items);
        setTotalRecords(Number(res?.data?.totalRecords || items.length || 0));

        const safeMetrics =
          res?.data?.metrics && typeof res.data.metrics === "object"
            ? {
                total: Number(res.data.metrics.total || 0),
                active: Number(res.data.metrics.active || 0),
                temporary: Number(res.data.metrics.temporary || 0),
                expired: Number(res.data.metrics.expired || 0),
              }
            : defaultMetrics;

        setMetrics(safeMetrics);
      } else {
        setData([]);
        setTotalRecords(0);
        setMetrics(defaultMetrics);
        toast.error(res?.message || "Failed to load assignments");
      }
    } catch {
      setData([]);
      setTotalRecords(0);
      setMetrics(defaultMetrics);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [pageNo, pageSize, searchQuery]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const columns = [
    {
      key: "driverName",
      label: "ASSIGNED PERSONNEL",
      visible: true,
      render: (_: unknown, row: AssignmentRow) => {
        const name = String(row?.driverName || "-");
        const initials =
          name && name !== "-" ? name.charAt(0).toUpperCase() : "-";

        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-600"}`}
            >
              {initials}
            </div>
            <div>
              <div
                className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {name}
              </div>
            </div>
          </div>
        );
      },
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
      render: (val: string) => {
        const normalized = String(val || "").toUpperCase();
        return (
          <span
            className={`px-3 py-1 rounded text-[10px] font-bold ${normalized === "PRIMARY" ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            {normalized || "-"}
          </span>
        );
      },
    },
    {
      key: "operationalWindow",
      label: "OPERATIONAL WINDOW",
      visible: true,
      render: (_: unknown, row: AssignmentRow) => (
        <div className="text-xs">
          <div className="text-gray-500">
            From:{" "}
            {row?.startTime ? new Date(row.startTime).toLocaleString() : "-"}
          </div>
          <div className="text-green-500 font-medium">
            To:{" "}
            {row?.expectedEnd
              ? new Date(row.expectedEnd).toLocaleString()
              : "Open / Active"}
          </div>
        </div>
      ),
    },
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
        <MetricCard
          icon={Users}
          label="Total Assignments"
          value={metrics?.total ?? 0}
          isDark={isDark}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <MetricCard
          icon={Truck}
          label="Active Primary"
          value={metrics?.active ?? 0}
          isDark={isDark}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
        <MetricCard
          icon={Clock}
          label="Temporary"
          value={metrics?.temporary ?? 0}
          isDark={isDark}
          iconBgColor="bg-orange-100"
          iconColor="text-orange-600"
        />
        <MetricCard
          icon={AlertCircle}
          label="Expired"
          value={metrics?.expired ?? 0}
          isDark={isDark}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
        />
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
        onEdit={(row) => router.push(`/driver-assignment/${row.assignmentId}`)}
        onDelete={(row) => {
          setSelectedItem(row);
          setIsDeleteDialogOpen(true);
        }}
        showActions
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={async () => {
          const res = await deleteAssignment(selectedItem?.assignmentId);
          if (res?.success || res?.statusCode === 200) {
            toast.success("Assignment removed successfully");
            fetchList();
          } else {
            toast.error(res?.message || "Failed to remove assignment");
          }
          setIsDeleteDialogOpen(false);
        }}
        title="Remove Assignment"
        message={`Are you sure you want to remove the assignment for ${selectedItem?.driverName || "this driver"}?`}
        type="danger"
        isDark={isDark}
      />
    </div>
  );
};

export default DriverAssignments;
