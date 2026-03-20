"use client";

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type React from "react";
import {
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

import subscriptionImg from "@/assets/activesubscription.png";
import usersImg from "@/assets/customers.png";
import dealersImg from "@/assets/dealers.png";
import deviceImg from "@/assets/devices.png";

import { Card, MetricCard } from "@/components/CommonCard";
import { useTheme } from "@/context/ThemeContext";

interface AlertItemProps {
  icon: React.ElementType;
  title: string;
  time: string;
  severity: string;
  iconBg: string;
  iconColor: string;
  isDark: boolean;
}

interface ServerStatusItemProps {
  name: string;
  status: "Operational" | "Outage";
  operationalLabel: string;
  outageLabel: string;
  isDark: boolean;
}

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
      <p
        className={`text-sm font-medium ${
          isDark ? "text-foreground" : "text-gray-900"
        }`}
      >
        {title}
      </p>
      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        {time} · {severity}
      </p>
    </div>
  </div>
);

const ServerStatusItem: React.FC<ServerStatusItemProps> = ({
  name,
  status,
  operationalLabel,
  outageLabel,
  isDark,
}) => (
  <div className="flex items-center justify-between py-3">
    <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
      {name}
    </span>
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        status === "Operational"
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {status === "Operational" ? operationalLabel : outageLabel}
    </span>
  </div>
);

// ==================== Dashboard Component ==================== //
const Dashboard: React.FC = () => {
  const { isDark } = useTheme();
  const t = useTranslations("pages.dashboard");

  const revenueData = [
    { month: t("revenue.months.jan"), value: 12000 },
    { month: t("revenue.months.feb"), value: 15000 },
    { month: t("revenue.months.mar"), value: 13000 },
    { month: t("revenue.months.apr"), value: 18000 },
    { month: t("revenue.months.may"), value: 21000 },
    { month: t("revenue.months.jun"), value: 24000 },
    { month: t("revenue.months.jul"), value: 23000 },
  ];

  const deviceStatusData = [
    { name: t("deviceStatus.installed"), value: 15000, color: "#6366f1" },
    { name: t("deviceStatus.available"), value: 7000, color: "#10b981" },
    { name: t("deviceStatus.faulty"), value: 2000, color: "#f59e0b" },
    { name: t("deviceStatus.returned"), value: 1480, color: "#ef4444" },
  ];

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto space-y-6">
          {/* Top Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              icon={usersImg}
              label={t("metrics.totalCustomers")}
              value={1250}
              iconBgColor="bg-indigo-50"
              iconColor="text-indigo-600"
              isDark={isDark}
            />
            <MetricCard
              icon={dealersImg}
              label={t("metrics.dealersDistributors")}
              value={85}
              iconBgColor="bg-emerald-50"
              iconColor="text-emerald-600"
              isDark={isDark}
            />
            <MetricCard
              icon={deviceImg}
              label={t("metrics.totalDevices")}
              value={25480}
              iconBgColor="bg-blue-50"
              iconColor="text-blue-600"
              isDark={isDark}
            />
            <MetricCard
              icon={subscriptionImg}
              label={t("metrics.activeSubscriptions")}
              value={22150}
              iconBgColor="bg-yellow-50"
              iconColor="text-yellow-600"
              isDark={isDark}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Summary */}
            <Card isDark={isDark}>
              <h3
                className={`text-lg font-semibold ${
                  isDark ? "text-foreground" : "text-gray-900"
                } mb-4`}
              >
                {t("sections.revenueSummary")}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#374151" : "#f0f0f0"}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{
                      fill: isDark ? "#9ca3af" : "#6b7280",
                      fontSize: 12,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fill: isDark ? "#9ca3af" : "#6b7280",
                      fontSize: 12,
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1f2937" : "white",
                      border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
                      borderRadius: "8px",
                      color: isDark ? "#f9fafb" : "#111827",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Device Status */}
            <Card isDark={isDark}>
              <h3
                className={`text-lg font-semibold ${
                  isDark ? "text-foreground" : "text-gray-900"
                } mb-4`}
              >
                {t("sections.deviceStatus")}
              </h3>
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={deviceStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {deviceStatusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  {deviceStatusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span
                        className={`text-sm ${
                          isDark ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Alerts */}
            <Card isDark={isDark}>
              <h3
                className={`text-lg font-semibold ${
                  isDark ? "text-foreground" : "text-gray-900"
                } mb-2`}
              >
                {t("sections.recentAlerts")}
              </h3>
              <div
                className={`divide-y ${
                  isDark ? "divide-gray-700" : "divide-gray-100"
                }`}
              >
                <AlertItem
                  icon={AlertTriangle}
                  title={t("alerts.cpuHigh.title")}
                  time={t("alerts.cpuHigh.time")}
                  severity={t("alerts.cpuHigh.severity")}
                  iconBg="bg-red-50"
                  iconColor="text-red-600"
                  isDark={isDark}
                />
                <AlertItem
                  icon={AlertCircle}
                  title={t("alerts.dbLimit.title")}
                  time={t("alerts.dbLimit.time")}
                  severity={t("alerts.dbLimit.severity")}
                  iconBg="bg-yellow-50"
                  iconColor="text-yellow-600"
                  isDark={isDark}
                />
                <AlertItem
                  icon={Info}
                  title={t("alerts.devicesOffline.title")}
                  time={t("alerts.devicesOffline.time")}
                  severity={t("alerts.devicesOffline.severity")}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                  isDark={isDark}
                />
              </div>
            </Card>

            {/* Server Health */}
            <Card isDark={isDark}>
              <h3
                className={`text-lg font-semibold ${
                  isDark ? "text-foreground" : "text-gray-900"
                } mb-2`}
              >
                {t("sections.serverHealth")}
              </h3>
              <div
                className={`divide-y ${
                  isDark ? "divide-gray-700" : "divide-gray-100"
                }`}
              >
                <ServerStatusItem
                  name={t("serverHealth.services.apiServer")}
                  status="Operational"
                  operationalLabel={t("serverHealth.status.operational")}
                  outageLabel={t("serverHealth.status.outage")}
                  isDark={isDark}
                />
                <ServerStatusItem
                  name={t("serverHealth.services.databaseCluster")}
                  status="Operational"
                  operationalLabel={t("serverHealth.status.operational")}
                  outageLabel={t("serverHealth.status.outage")}
                  isDark={isDark}
                />
                <ServerStatusItem
                  name={t("serverHealth.services.telemetryIngestion")}
                  status="Operational"
                  operationalLabel={t("serverHealth.status.operational")}
                  outageLabel={t("serverHealth.status.outage")}
                  isDark={isDark}
                />
                <ServerStatusItem
                  name={t("serverHealth.services.forwardingService")}
                  status="Outage"
                  operationalLabel={t("serverHealth.status.operational")}
                  outageLabel={t("serverHealth.status.outage")}
                  isDark={isDark}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
