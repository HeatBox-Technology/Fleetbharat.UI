"use client";
import MultiSelect, { OptionType } from "@/components/MultiSelect";
import ActionLoader from "@/components/ActionLoader";
import { MetricCard } from "@/components/CommonCard";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import { javaApi } from "@/services/apiService";
import { getAllAccounts, getVehicleDropdown } from "@/services/commonServie";
import {
  Activity,
  BellRing,
  Building2,
  CalendarDays,
  Search,
  Shield,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type AlarmReportRow = {
  orgId?: number;
  orgName?: string;
  vehicleId?: string;
  vehicleNo?: string;
  deviceNo?: string;
  imei?: string;
  type?: string;
  status?: string;
  severity?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  gpsTime?: string;
  receivedTime?: string;
};

const ALL_ACCOUNTS_VALUE = "__all_accounts__";
const ALL_VEHICLES_VALUE = "__all_vehicles__";
const ALL_ALERTS_VALUE = "__all_alerts__";

const ALL_ACCOUNTS_OPTION: OptionType = {
  label: "All Organizations",
  value: ALL_ACCOUNTS_VALUE,
};
const ALL_VEHICLES_OPTION: OptionType = {
  label: "All Vehicles",
  value: ALL_VEHICLES_VALUE,
};
const ALL_ALERTS_OPTION: OptionType = {
  label: "All Alerts",
  value: ALL_ALERTS_VALUE,
};

const ALERT_OPTIONS: OptionType[] = [
  ALL_ALERTS_OPTION,
  { label: "Power Cut", value: "Power Cut" },
  { label: "Ignition", value: "Ignition" },
  { label: "Overspeed", value: "Overspeed" },
  { label: "AC", value: "AC" },
  { label: "SOS", value: "SOS" },
  { label: "Geofence In", value: "Geofence In" },
  { label: "Geofence Out", value: "Geofence Out" },
  { label: "Harsh Braking", value: "Harsh Braking" },
  { label: "Harsh Acceleration", value: "Harsh Acceleration" },
  { label: "Idle", value: "Idle" },
  { label: "Low Battery", value: "Low Battery" },
  { label: "Main Power Restore", value: "Main Power Restore" },
  { label: "Battery Disconnect", value: "Battery Disconnect" },
  { label: "Tow", value: "Tow" },
  { label: "Tamper", value: "Tamper" },
  { label: "E-Lock Alert", value: "E-Lock Alert" },
  { label: "Steel Wire Lock Cut", value: "Steel Wire Lock Cut" },
  { label: "Steel Wire Lock Open", value: "Steel Wire Lock Open" },
  { label: "Steel Wire Lock Tamper", value: "Steel Wire Lock Tamper" },
  { label: "Steel Wire Lock Disconnect", value: "Steel Wire Lock Disconnect" },
  { label: "Steel Wire Lock Low Battery", value: "Steel Wire Lock Low Battery" },
  { label: "Steel Wire Lock Battery Restore", value: "Steel Wire Lock Battery Restore" },
  { label: "Steel Wire Lock Locked", value: "Steel Wire Lock Locked" },
  { label: "Steel Wire Lock Unlocked", value: "Steel Wire Lock Unlocked" },
  { label: "Rash Driving", value: "Rash Driving" },
  { label: "Night Driving", value: "Night Driving" },
  { label: "Route Deviation", value: "Route Deviation" },
  { label: "Stoppage", value: "Stoppage" },
];

const toOptionLabel = (item: {
  label?: string;
  value?: string | number;
  name?: string;
  vehicleNo?: string;
  vehicleNumber?: string;
  registrationNo?: string;
  registrationNumber?: string;
  id?: string | number;
}) =>
  String(
    item.label ??
      item.name ??
      item.vehicleNo ??
      item.vehicleNumber ??
      item.registrationNo ??
      item.registrationNumber ??
      item.value ??
      item.id ??
      "Unknown",
  );

const toVehicleOptionValue = (item: {
  value?: string | number;
  id?: string | number;
  vehicleId?: string | number;
}) => String(item.vehicleId ?? item.id ?? item.value ?? "");

const toAccountOptionValue = (item: {
  id?: string | number;
  value?: string | number;
}) => String(item.id ?? item.value ?? "");

const formatDateTime = (value?: string) => {
  if (!value) return "NA";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getGoogleMapsLink = (latitude?: number, longitude?: number) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "";
  }

  return `https://www.google.com/maps?q=${lat},${lng}`;
};

const toDateTimeLocalValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toApiDateTime = (value: string) => {
  if (!value) return "";

  const normalized = value.trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(
    parsed.getDate(),
  )}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(
    parsed.getSeconds(),
  )}`;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const ALERT_SEVERITY_MAP: Record<string, "Critical" | "Warning" | "Info"> = {
  "power cut": "Critical",
  "battery disconnect": "Critical",
  tamper: "Critical",
  tow: "Critical",
  sos: "Critical",
  "e-lock alert": "Critical",
  "steel wire lock cut": "Critical",
  "steel wire lock open": "Critical",
  "steel wire lock tamper": "Critical",
  "steel wire lock disconnect": "Critical",
  overspeed: "Critical",
  "over speeding": "Critical",
  "main power restore": "Info",
  "steel wire lock battery restore": "Info",
  "steel wire lock locked": "Info",
  ignition: "Info",
  "ignition on": "Info",
  ac: "Info",
  idle: "Info",
  stoppage: "Info",
  "geofence in": "Info",
  "geofence out": "Info",
  "steel wire lock low battery": "Warning",
  "steel wire lock unlocked": "Warning",
  "harsh braking": "Warning",
  "sudden braking": "Warning",
  "harsh acceleration": "Warning",
  "rash driving": "Warning",
  "night driving": "Warning",
  "route deviation": "Warning",
  "low battery": "Warning",
};

const getSeverityLabel = (severity?: string, alertType?: string) => {
  const normalizedSeverity = String(severity || "").trim().toLowerCase();

  if (normalizedSeverity === "critical") return "Critical";
  if (normalizedSeverity === "warning") return "Warning";
  if (normalizedSeverity === "info") return "Info";

  const normalizedAlertType = String(alertType || "").trim().toLowerCase();
  return ALERT_SEVERITY_MAP[normalizedAlertType] || "Info";
};

const getSeverityBadgeClassName = (severity: string) => {
  if (severity === "Critical") {
    return "bg-red-500 text-white";
  }

  if (severity === "Warning") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
};

const AlarmReportPage = () => {
  const { isDark } = useTheme();
  const [accounts, setAccounts] = useState<OptionType[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<OptionType[]>([]);
  const [vehicles, setVehicles] = useState<OptionType[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<OptionType[]>([]);
  const [selectedAlerts, setSelectedAlerts] = useState<OptionType[]>(
    ALERT_OPTIONS,
  );
  const [startDate, setStartDate] = useState(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return toDateTimeLocalValue(start);
  });
  const [endDate, setEndDate] = useState(() => {
    const end = new Date();
    end.setHours(23, 59, 0, 0);
    return toDateTimeLocalValue(end);
  });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AlarmReportRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [emptyMessage, setEmptyMessage] = useState("No record found");

  const getUserAccountIdFromStorage = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return Number(user?.accountId || 0);
    } catch (error) {
      console.error("Failed to parse user account:", error);
      return 0;
    }
  };

  useEffect(() => {
    const initAccounts = async () => {
      try {
        const userAccountId = getUserAccountIdFromStorage();
        const response = await getAllAccounts();
        if (response?.statusCode === 200 && Array.isArray(response?.data)) {
          const accountOptions = [
            ALL_ACCOUNTS_OPTION,
            ...response.data.map(
              (account: {
                id?: number | string;
                value?: string;
                label?: string;
              }) => ({
                label: toOptionLabel(account),
                value: toAccountOptionValue(account),
              }),
            ),
          ];
          setAccounts(accountOptions);

          if (userAccountId > 0) {
            const defaultAccount = accountOptions.find(
              (account) => Number(account.value) === userAccountId,
            );
            setSelectedAccounts(defaultAccount ? [defaultAccount] : []);
          } else {
            setSelectedAccounts([ALL_ACCOUNTS_OPTION]);
          }
        }
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message || "Failed to load organizations",
        );
      }
    };

    initAccounts();
  }, []);

  const fetchVehiclesForOrganization = async (accountIds: number[]) => {
    try {
      if (!accountIds.length) {
        setVehicles([]);
        setSelectedVehicles([]);
        return;
      }

      const responses = await Promise.all(
        accountIds.map((accountId) => getVehicleDropdown(String(accountId))),
      );
      const seenVehicles = new Set<string>();
      const vehicleOptions: OptionType[] = responses.flatMap((res) => {
        const vehicleList = Array.isArray(res?.data) ? res.data : [];
        return vehicleList
          .map((vehicle: {
            label?: string;
            value?: string | number;
            name?: string;
            vehicleNo?: string;
            vehicleNumber?: string;
            registrationNo?: string;
            registrationNumber?: string;
            id?: string | number;
            vehicleId?: string | number;
          }): OptionType => ({
            label: toOptionLabel(vehicle),
            value: toVehicleOptionValue(vehicle),
          }))
          .filter((vehicle: OptionType) => {
            if (!vehicle.value || seenVehicles.has(vehicle.value)) {
              return false;
            }
            seenVehicles.add(vehicle.value);
            return true;
          });
      });

      setVehicles(
        vehicleOptions.length ? [ALL_VEHICLES_OPTION, ...vehicleOptions] : [],
      );
      setSelectedVehicles((previous) =>
        !vehicleOptions.length
          ? []
          : previous.length === 0
            ? [ALL_VEHICLES_OPTION, ...vehicleOptions]
            : previous.some((vehicle) => vehicle.value === ALL_VEHICLES_VALUE)
              ? [ALL_VEHICLES_OPTION, ...vehicleOptions]
              : previous.filter((vehicle) =>
                  vehicleOptions.some(
                    (option) => option.value === vehicle.value,
                  ),
                ),
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load vehicles");
    }
  };

  useEffect(() => {
    fetchVehiclesForOrganization(
      (
        selectedAccounts.some((account) => account.value === ALL_ACCOUNTS_VALUE)
          ? accounts.filter((account) => account.value !== ALL_ACCOUNTS_VALUE)
          : selectedAccounts
      )
        .map((account) => Number(account.value))
        .filter((value) => Number.isFinite(value) && value > 0),
    );
    setData([]);
  }, [selectedAccounts, accounts]);

  const handleAccountChange = (nextAccounts: OptionType[]) => {
    const hadAllSelected = selectedAccounts.some(
      (account) => account.value === ALL_ACCOUNTS_VALUE,
    );
    const hasAllSelected = nextAccounts.some(
      (account) => account.value === ALL_ACCOUNTS_VALUE,
    );
    const realAccounts = accounts.filter(
      (account) => account.value !== ALL_ACCOUNTS_VALUE,
    );

    if (hasAllSelected && !hadAllSelected) {
      setSelectedAccounts([ALL_ACCOUNTS_OPTION, ...realAccounts]);
      return;
    }

    if (!hasAllSelected && hadAllSelected) {
      setSelectedAccounts([]);
      return;
    }

    if (nextAccounts.length === realAccounts.length && realAccounts.length > 0) {
      setSelectedAccounts([ALL_ACCOUNTS_OPTION, ...realAccounts]);
    } else {
      setSelectedAccounts(
        nextAccounts.filter((account) => account.value !== ALL_ACCOUNTS_VALUE),
      );
    }
  };

  const handleVehicleChange = (nextVehicles: OptionType[]) => {
    const hadAllSelected = selectedVehicles.some(
      (vehicle) => vehicle.value === ALL_VEHICLES_VALUE,
    );
    const hasAllSelected = nextVehicles.some(
      (vehicle) => vehicle.value === ALL_VEHICLES_VALUE,
    );
    const realVehicles = vehicles.filter(
      (vehicle) => vehicle.value !== ALL_VEHICLES_VALUE,
    );

    if (hasAllSelected && !hadAllSelected) {
      setSelectedVehicles([ALL_VEHICLES_OPTION, ...realVehicles]);
      return;
    }

    if (!hasAllSelected && hadAllSelected) {
      setSelectedVehicles([]);
      return;
    }

    if (nextVehicles.length === realVehicles.length && realVehicles.length > 0) {
      setSelectedVehicles([ALL_VEHICLES_OPTION, ...realVehicles]);
    } else {
      setSelectedVehicles(
        nextVehicles.filter((vehicle) => vehicle.value !== ALL_VEHICLES_VALUE),
      );
    }
  };

  const handleAlertChange = (nextAlerts: OptionType[]) => {
    const hadAllSelected = selectedAlerts.some(
      (alert) => alert.value === ALL_ALERTS_VALUE,
    );
    const hasAllSelected = nextAlerts.some(
      (alert) => alert.value === ALL_ALERTS_VALUE,
    );
    const realAlerts = ALERT_OPTIONS.filter(
      (alert) => alert.value !== ALL_ALERTS_VALUE,
    );

    if (hasAllSelected && !hadAllSelected) {
      setSelectedAlerts([ALL_ALERTS_OPTION, ...realAlerts]);
      return;
    }

    if (!hasAllSelected && hadAllSelected) {
      setSelectedAlerts([]);
      return;
    }

    if (nextAlerts.length === realAlerts.length && realAlerts.length > 0) {
      setSelectedAlerts([ALL_ALERTS_OPTION, ...realAlerts]);
    } else {
      setSelectedAlerts(
        nextAlerts.filter((alert) => alert.value !== ALL_ALERTS_VALUE),
      );
    }
  };

  const handleViewReport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      toast.error("Start date cannot be after end date");
      return;
    }

    const orgIds = (
      selectedAccounts.some((account) => account.value === ALL_ACCOUNTS_VALUE)
        ? accounts.filter((account) => account.value !== ALL_ACCOUNTS_VALUE)
        : selectedAccounts
    )
      .map((account) => Number(account.value))
      .filter((value) => Number.isFinite(value) && value > 0);

    const vehicleIds = (
      selectedVehicles.some((vehicle) => vehicle.value === ALL_VEHICLES_VALUE)
        ? vehicles.filter((vehicle) => vehicle.value !== ALL_VEHICLES_VALUE)
        : selectedVehicles
    )
      .map((vehicle) => String(vehicle.value))
      .filter(Boolean);

    const alertValues = (
      selectedAlerts.some((alert) => alert.value === ALL_ALERTS_VALUE)
        ? ALERT_OPTIONS.filter((alert) => alert.value !== ALL_ALERTS_VALUE)
        : selectedAlerts
    )
      .map((alert) => String(alert.value))
      .filter(Boolean);

    if (!orgIds.length) {
      toast.error("Please select at least one organization");
      return;
    }

    if (!alertValues.length) {
      toast.error("Please select at least one alert");
      return;
    }

    try {
      setLoading(true);
      const response = await javaApi.post("reports/history-alert", {
        orgIds,
        vehicleIds,
        start: toApiDateTime(startDate),
        end: toApiDateTime(endDate),
        alerts: alertValues,
      });
      const payload = response?.data;
      const isValid = payload?.valid !== false;
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      const noDataMessage =
        String(payload?.message || "").trim() || "No record found";

      if (!isValid || !rows.length) {
        setData([]);
        setEmptyMessage(noDataMessage);
        toast.info(noDataMessage);
        return;
      }

      setEmptyMessage("No record found");
      setData(rows);
    } catch (error: any) {
      setData([]);
      toast.error(
        error?.response?.data?.message || "Failed to load alarm report",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data.length) {
      toast.info("No record found");
      return;
    }

    const rows = data.map((row) => ({
      Organization:
        row.orgName ||
        (row.orgId ? accountNameById.get(Number(row.orgId)) : "") ||
        "NA",
      Vehicle: row.vehicleNo || "NA",
      "Device No": row.deviceNo || "NA",
      Alert: row.type || "NA",
      Status: row.status || "NA",
      Severity: getSeverityLabel(row.severity, row.type),
      Location:
        row.address?.trim() || getGoogleMapsLink(row.latitude, row.longitude) || "NA",
      Latitude:
        row.latitude !== undefined ? Number(row.latitude).toFixed(6) : "NA",
      Longitude:
        row.longitude !== undefined ? Number(row.longitude).toFixed(6) : "NA",
      "Received Time": formatDateTime(row.receivedTime),
    }));

    const headers = Object.keys(rows[0]);
    const tableRows = rows
      .map(
        (row) =>
          `<tr>${headers
            .map(
              (header) =>
                `<td>${escapeHtml(row[header as keyof typeof row])}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table {
              border-collapse: collapse;
              width: 100%;
              font-family: Calibri, Arial, sans-serif;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
              vertical-align: top;
              text-align: left;
            }
            th {
              background: #eef2ff;
              color: #1e293b;
              font-weight: 700;
            }
            tr:nth-child(even) td {
              background: #f8fafc;
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>${headers
                .map((header) => `<th>${escapeHtml(header)}</th>`)
                .join("")}</tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([`\ufeff${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");

    link.href = url;
    link.download = `alarm-report-${stamp}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  };

  const totalAlerts = data.length;
  const uniqueVehicles = new Set(
    data.map((row) => row.vehicleId || row.vehicleNo).filter(Boolean),
  ).size;
  const uniqueAlertTypes = new Set(data.map((row) => row.type).filter(Boolean))
    .size;
  const uniqueDevices = new Set(data.map((row) => row.deviceNo).filter(Boolean))
    .size;
  const accountNameById = new Map(
    accounts
      .filter((account) => account.value !== ALL_ACCOUNTS_VALUE)
      .map((account) => [Number(account.value), account.label]),
  );

  const filteredData = data.filter((row) => {
    if (!searchQuery.trim()) return true;

    const haystack = [
      row.orgName,
      row.orgId ? accountNameById.get(Number(row.orgId)) : "",
      row.vehicleNo,
      row.vehicleId,
      row.deviceNo,
      row.imei,
      row.type,
      row.status,
      row.severity,
      row.address,
      row.receivedTime,
      row.latitude,
      row.longitude,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-4 mt-10">
      <ActionLoader isVisible={loading} text="Loading alarm report..." />
      <PageHeader
        title="Alarm Report"
        breadcrumbs={[
          { label: "Operations", href: "/operations" },
          { label: "Reports", href: "/report" },
          { label: "Alarm Report" },
        ]}
        showButton={true}
        buttonText={loading ? "Loading..." : "View Report"}
        onButtonClick={() => {
          if (!loading) handleViewReport();
        }}
        showExportButton={true}
        ExportbuttonText="Export Excel"
        onExportClick={handleExport}
        showFilterButton={false}
      />

      <div className="mb-6 overflow-visible rounded-[28px] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
        <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-sky-500 to-emerald-500" />
        <div className="grid items-start gap-4 p-5 md:grid-cols-2 xl:grid-cols-[minmax(210px,1.1fr)_minmax(220px,1.15fr)_minmax(220px,1.15fr)_minmax(185px,0.9fr)_minmax(185px,0.9fr)_auto]">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
              <Building2 className="h-3.5 w-3.5" />
              Organization
            </div>
            <MultiSelect
              options={accounts}
              value={selectedAccounts}
              onChange={handleAccountChange}
              placeholder="Select Account"
              searchPlaceholder="Search account..."
            />
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
              <Truck className="h-3.5 w-3.5" />
              Vehicle Plate
            </div>
            <MultiSelect
              options={vehicles}
              value={selectedVehicles}
              onChange={handleVehicleChange}
              placeholder="Select Vehicle"
              searchPlaceholder="Search vehicle..."
              isDisabled={!selectedAccounts.length}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
              <BellRing className="h-3.5 w-3.5" />
              Alert Type
            </div>
            <MultiSelect
              options={ALERT_OPTIONS}
              value={selectedAlerts}
              onChange={handleAlertChange}
              placeholder="Select Alert"
              searchPlaceholder="Search alert..."
            />
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              From Date
            </div>
            <input
              type="datetime-local"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date & Time"
            />
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              To Date
            </div>
            <input
              type="datetime-local"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date & Time"
            />
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Activity}
          label="Total Alerts"
          value={totalAlerts}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          isDark={isDark}
        />
        <MetricCard
          icon={Truck}
          label="Unique Vehicles"
          value={uniqueVehicles}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          isDark={isDark}
        />
        <MetricCard
          icon={BellRing}
          label="Alert Types"
          value={uniqueAlertTypes}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-600"
          isDark={isDark}
        />
        <MetricCard
          icon={Shield}
          label="Devices Seen"
          value={uniqueDevices}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          isDark={isDark}
        />
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all fields..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Showing {filteredData.length} of {data.length} records
          </div>
        </div>

        <div className="overflow-x-auto rounded-[24px] border border-slate-200">
          <div className="min-w-[1160px]">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_0.8fr_0.9fr_0.95fr_1.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-600">
              <div>Organization</div>
              <div>Vehicle</div>
              <div>Device</div>
              <div>Alert</div>
              <div>Status</div>
              <div>Severity</div>
              <div>Received</div>
              <div>Location</div>
            </div>

            {filteredData.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm font-medium text-slate-500">
                {emptyMessage}
              </div>
            ) : (
              filteredData.map((row, index) => {
                const mapLink = getGoogleMapsLink(row.latitude, row.longitude);

                return (
                  <div
                    key={`${row.vehicleId || row.deviceNo || "row"}-${index}`}
                    className="grid grid-cols-[1fr_1fr_1fr_1fr_0.8fr_0.9fr_0.95fr_1.8fr] gap-4 border-b border-slate-200 px-6 py-5 last:border-b-0"
                  >
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        {row.orgName ||
                          (row.orgId
                            ? accountNameById.get(Number(row.orgId))
                            : "") ||
                          "NA"}
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        {row.vehicleNo || "NA"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {row.deviceNo || "NA"}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-violet-600">
                      {row.type || "NA"}
                    </div>
                    <div>
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                        {row.status || "NA"}
                      </span>
                    </div>
                    <div>
                      <span
                        className={`inline-flex min-w-[88px] justify-center rounded-xl px-3 py-1.5 text-sm font-semibold ${getSeverityBadgeClassName(
                          getSeverityLabel(row.severity, row.type),
                        )}`}
                      >
                        {getSeverityLabel(row.severity, row.type)}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-700">
                      {formatDateTime(row.receivedTime)}
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div>
                        {row.address?.trim() ? (
                          row.address
                        ) : mapLink ? (
                          <a
                            href={mapLink}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                          >
                            Open map
                          </a>
                        ) : (
                          "NA"
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {row.latitude !== undefined && row.longitude !== undefined
                          ? `${Number(row.latitude).toFixed(6)}, ${Number(
                              row.longitude,
                            ).toFixed(6)}`
                          : "Coordinates unavailable"}
                      </div>
                      {!!row.address?.trim() && mapLink && (
                        <a
                          href={mapLink}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                        >
                          Open map
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlarmReportPage;
