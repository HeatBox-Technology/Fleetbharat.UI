"use client";

import {
  AlertTriangle,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Building2,
  Truck,
  Users,
  Box,
  Zap,
  WifiOff,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, MetricCard } from "@/components/CommonCard";
import MultiSelect, { OptionType } from "@/components/MultiSelect";
import { useTheme } from "@/context/ThemeContext";
import { getAllAccounts } from "@/services/commonServie";

interface AlertItemProps {
  icon: React.ElementType;
  title: string;
  time: string;
  severity: string;
  iconBg: string;
  iconColor: string;
  isDark: boolean;
}

interface MetricItem {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

interface ChartLegendItem {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

const toOptionLabel = (item: { label?: string; name?: string; value?: string | number }) =>
  String(item.label ?? item.name ?? item.value ?? "Unknown");

const toAccountOptionValue = (item: { id?: string | number; value?: string | number }) =>
  String(item.id ?? item.value ?? "");

const AlertItem: React.FC<AlertItemProps> = ({
  icon: Icon,
  title,
  time,
  severity,
  iconBg,
  iconColor,
  isDark,
}) => (
  <div className="flex items-start gap-3 py-3">
    <div className={`${iconBg} p-2 rounded-lg`}>
      <Icon className={`w-4 h-4 ${iconColor}`} />
    </div>
    <div className="flex-1">
      <p className={`text-sm font-medium ${isDark ? "text-foreground" : "text-gray-900"}`}>
        {title}
      </p>
      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        {time} · {severity}
      </p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { isDark } = useTheme();
  const [accounts, setAccounts] = useState<OptionType[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<OptionType[]>([]);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await getAllAccounts();
        const accountOptions = Array.isArray(response?.data)
          ? response.data.map((account: any) => ({
              label: toOptionLabel(account),
              value: toAccountOptionValue(account),
            }))
          : [];

        setAccounts(accountOptions);
        setSelectedAccounts(accountOptions.length ? [accountOptions[0]] : []);
      } catch (error) {
        setAccounts([]);
      }
    };

    loadAccounts();
  }, []);

  const topMetrics: MetricItem[] = [
    {
      label: "Total Vehicles",
      value: 1284,
      icon: Truck,
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600",
    },
    {
      label: "Total Devices",
      value: 1450,
      icon: Box,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Total Customers",
      value: 312,
      icon: Users,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
    {
      label: "Active (Ignition On)",
      value: 842,
      icon: Zap,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Offline Devices",
      value: 42,
      icon: WifiOff,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      label: "Alerts Today",
      value: 28,
      icon: AlertTriangle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  const deviceInventoryData = [
    { name: "Installed", value: 1284 },
    { name: "Available", value: 210 },
  ];

  const statusDistribution: ChartLegendItem[] = [
    { name: "Moving", value: 842, color: "#22c55e" },
    { name: "Idle", value: 156, color: "#eab308" },
    { name: "Parked", value: 244, color: "#2563eb" },
    { name: "Offline", value: 42, color: "#ef4444" },
  ];

  const alertsBreakdownData = [
    { name: "Overspeeding", value: 42 },
    { name: "Geofence Exit", value: 34 },
    { name: "Harsh Braking", value: 28 },
    { name: "Idling Alert", value: 20 },
    { name: "SOS Alert", value: 8 },
  ];

  const recentAlerts = [
    {
      vehicle: "KA-01-HH-1234",
      alert: "Overspeeding",
      time: "10:45 AM",
      status: "Critical",
      statusClass: "bg-red-100 text-red-800",
    },
    {
      vehicle: "MH-12-JK-5678",
      alert: "Geofence Exit",
      time: "10:32 AM",
      status: "Warning",
      statusClass: "bg-orange-100 text-orange-800",
    },
    {
      vehicle: "DL-04-AB-9012",
      alert: "Harsh Braking",
      time: "10:15 AM",
      status: "Warning",
      statusClass: "bg-orange-100 text-orange-800",
    },
    {
      vehicle: "KA-05-MN-3456",
      alert: "SOS Alert",
      time: "09:58 AM",
      status: "Critical",
      statusClass: "bg-red-100 text-red-800",
    },
    {
      vehicle: "TN-07-XY-7890",
      alert: "Idling Alert",
      time: "09:42 AM",
      status: "Info",
      statusClass: "bg-slate-100 text-slate-800",
    },
  ];

  const complianceReminders = [
    {
      vehicle: "KA-01-HH-1234",
      puc: "2026-04-15",
      insurance: "2026-05-20",
      status: "Due Soon",
      statusClass: "bg-amber-100 text-amber-800",
    },
    {
      vehicle: "MH-12-JK-5678",
      puc: "2026-04-10",
      insurance: "2026-06-12",
      status: "Overdue",
      statusClass: "bg-red-100 text-red-800",
    },
    {
      vehicle: "DL-04-AB-9012",
      puc: "2026-05-05",
      insurance: "2026-04-25",
      status: "Due Soon",
      statusClass: "bg-amber-100 text-amber-800",
    },
    {
      vehicle: "KA-05-MN-3456",
      puc: "2026-06-20",
      insurance: "2026-07-15",
      status: "Healthy",
      statusClass: "bg-emerald-100 text-emerald-800",
    },
  ];

  return (
    <div className={`${isDark ? "dark" : ""} mt-8`}>
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Dashboard Overview</p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">
                Welcome back!
              </h1>
            </div>
              <div className="w-full max-w-[280px]">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                <Building2 className="h-3.5 w-3.5" />
                Organization
              </div>
              <MultiSelect
                options={accounts}
                value={selectedAccounts}
                onChange={(next) => setSelectedAccounts(next.length ? [next[next.length - 1]] : [])}
                placeholder="Select Organization"
                searchPlaceholder="Search organization..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {topMetrics.map((metric) => (
              <MetricCard
                key={metric.label}
                icon={metric.icon}
                label={metric.label}
                value={metric.value}
                iconBgColor={metric.iconBg}
                iconColor={metric.iconColor}
                isDark={isDark}
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card isDark={isDark}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Device Inventory</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Installed vs Available devices</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deviceInventoryData} margin={{ top: 10, right: 0, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#313131" : "#e5e7eb"} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? "#0f172a" : "white", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, borderRadius: 10, color: isDark ? "#f8fafc" : "#0f172a" }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card isDark={isDark}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Vehicle Status Distribution</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Current fleet composition</p>
              </div>
              <div className="flex flex-col items-center gap-6">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusDistribution} innerRadius={72} outerRadius={108} dataKey="value" paddingAngle={4}>
                        {statusDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-2">
                  {statusDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card isDark={isDark}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Alerts Breakdown</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Frequency of alert types today</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={alertsBreakdownData} margin={{ top: 10, right: 0, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#313131" : "#e5e7eb"} vertical={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12 }} width={110} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? "#0f172a" : "white", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, borderRadius: 10, color: isDark ? "#f8fafc" : "#0f172a" }} />
                    <Bar dataKey="value" fill="#f97316" radius={[10, 0, 0, 10]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card isDark={isDark}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Alerts</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Latest critical events from the fleet</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search across all fields..."
                      className={`w-full rounded-2xl border px-3 py-2 pl-10 text-sm ${isDark ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
                    />
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    View 10
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    Columns
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700 dark:divide-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-4 font-medium">Vehicle</th>
                      <th className="px-4 py-4 font-medium">Alert Type</th>
                      <th className="px-4 py-4 font-medium">Time</th>
                      <th className="px-4 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {recentAlerts.map((item) => (
                      <tr key={item.vehicle}>
                        <td className="px-4 py-4 font-medium text-slate-900 dark:text-slate-100">{item.vehicle}</td>
                        <td className="px-4 py-4">{item.alert}</td>
                        <td className="px-4 py-4 text-slate-500 dark:text-slate-400">{item.time}</td>
                        <td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.statusClass}`}>{item.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Showing 5 of 5 records</span>
                <div className="inline-flex items-center gap-2">
                  <button className="h-8 w-8 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">&lt;</button>
                  <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-2xl bg-violet-600 px-3 text-white">1</span>
                  <button className="h-8 w-8 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">&gt;</button>
                </div>
              </div>
            </Card>

            <Card isDark={isDark}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Compliance Reminders</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Upcoming document and service renewals</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search across all fields..."
                      className={`w-full rounded-2xl border px-3 py-2 pl-10 text-sm ${isDark ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
                    />
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    View 10
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    Columns
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700 dark:divide-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-4 font-medium">Vehicle</th>
                      <th className="px-4 py-4 font-medium">PUC Expiry</th>
                      <th className="px-4 py-4 font-medium">Insurance</th>
                      <th className="px-4 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {complianceReminders.map((item) => (
                      <tr key={item.vehicle}>
                        <td className="px-4 py-4 font-medium text-slate-900 dark:text-slate-100">{item.vehicle}</td>
                        <td className="px-4 py-4">{item.puc}</td>
                        <td className="px-4 py-4">{item.insurance}</td>
                        <td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.statusClass}`}>{item.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Showing 4 of 4 records</span>
                <div className="inline-flex items-center gap-2">
                  <button className="h-8 w-8 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">&lt;</button>
                  <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-2xl bg-violet-600 px-3 text-white">1</span>
                  <button className="h-8 w-8 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">&gt;</button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
