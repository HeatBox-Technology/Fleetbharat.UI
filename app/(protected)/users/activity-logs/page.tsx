"use client";

import React, { useEffect, useState } from "react";
import CommonTable from "@/components/CommonTable";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import PageHeader from "@/components/PageHeader";
import { MetricCard } from "@/components/CommonCard";
import { useTheme } from "@/context/ThemeContext";
import { Activity, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";

interface ActivityLogData {
  no: number;
  event: string;
  user: string;
  target: string;
  details: string;
  time: string;
  status: {
    label: string;
    variant: "success" | "error" | "warning" | "info";
  };
}

const ActivityLogs: React.FC = () => {
  const { isDark } = useTheme();
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const columns = [
    {
      key: "no",
      label: "NO",
      visible: true,
    },
    {
      key: "event",
      label: "EVENT",
      visible: true,
    },
    {
      key: "user",
      label: "USER",
      visible: true,
    },
    {
      key: "target",
      label: "TARGET",
      visible: true,
    },
    {
      key: "details",
      label: "DETAILS",
      visible: true,
    },
    {
      key: "time",
      label: "TIME",
      visible: true,
    },
    {
      key: "status",
      label: "STATUS",
      type: "badge" as const,
      visible: true,
    },
  ];

  const [data, setData] = useState<ActivityLogData[]>([
    {
      no: 1,
      event: "User Created",
      user: "Admin",
      target: "John Doe",
      details: "Created new user account with Admin role.",
      time: "2 mins ago",
      status: { label: "Success", variant: "success" },
    },
    {
      no: 2,
      event: "Failed Login",
      user: "System",
      target: "kyle@resistance.org",
      details: "Invalid password attempt from IP 192.168.1.1",
      time: "2 hours ago",
      status: { label: "Failure", variant: "error" },
    },
    {
      no: 3,
      event: "User Updated",
      user: "Admin",
      target: "Sarah Connor",
      details: "Updated user role to Account Manager.",
      time: "5 hours ago",
      status: { label: "Success", variant: "success" },
    },
    {
      no: 4,
      event: "Password Reset",
      user: "System",
      target: "mike@tech.com",
      details: "Password reset link sent via email.",
      time: "1 day ago",
      status: { label: "Success", variant: "success" },
    },
    {
      no: 5,
      event: "Account Locked",
      user: "System",
      target: "suspicious@user.com",
      details: "Account locked after 5 failed login attempts.",
      time: "2 days ago",
      status: { label: "Failure", variant: "error" },
    },
  ]);

  const handlePageChange = (page: number) => {
    setPageNo(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageNo(1);
  };

  const handleExport = () => {
    console.log("Exporting activity logs...");
    toast.info("Export functionality coming soon!");
  };

  return (
    <div className={`${isDark ? "dark" : ""} mt-10 sm:`}>
      <div className={`min-h-screen ${isDark ? "bg-background" : ""} p-2`}>
        <PageHeader
          title="Activity Logs"
          subtitle="Audit trail of all security and system events."
          breadcrumbs={[{ label: "Users" }, { label: "Activity Logs" }]}
          showButton={false}
          showExportButton={true}
          ExportbuttonText="Export"
          onExportClick={handleExport}
        />

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MetricCard
            icon={Activity}
            label="Total Events"
            value={5}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
            isDark={isDark}
          />
          <MetricCard
            icon={AlertTriangle}
            label="Failures"
            value={1}
            iconBgColor="bg-red-100"
            iconColor="text-red-600"
            isDark={isDark}
          />
        </div>

        {/* Table */}
        <CommonTable
          columns={columns}
          data={data}
          showActions={false}
          searchPlaceholder="Search across all fields..."
          rowsPerPageOptions={[10, 25, 50, 100]}
          defaultRowsPerPage={10}
          pageNo={pageNo}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
};

export default ActivityLogs;
