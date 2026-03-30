"use client";
import React, { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  CalendarDays,
  Clock,
  Search,
  Shield,
  TrendingUp,
  Truck,
} from "lucide-react";
import ActionLoader from "@/components/ActionLoader";
import { MetricCard } from "@/components/CommonCard";
import PageHeader from "@/components/PageHeader";
import MultiSelect, { OptionType } from "@/components/MultiSelect";
import { useTheme } from "@/context/ThemeContext";
import { getAllAccounts, getVehicleDropdown } from "@/services/commonServie";
import { toast } from "react-toastify";
import { javaApi } from "@/services/apiService";

type RunReportRow = {
  orgId?: number;
  orgName?: string;
  vehicleNo?: string;
  vehicleId?: string;
  reportDate?: string;
  firstDataTime?: string;
  lastDataTime?: string;
  distanceKm?: number;
  ignitionOnMinutes?: number;
  acOnMinutes?: number;
  movingTimeMinutes?: number;
  idleTimeMinutes?: number;
  fleetEfficiency?: number;
  startLatitude?: number;
  startLongitude?: number;
  startAddress?: string | null;
  endLatitude?: number;
  endLongitude?: number;
  endAddress?: string | null;
};

const ALL_ACCOUNTS_VALUE = "__all_accounts__";
const ALL_VEHICLES_VALUE = "__all_vehicles__";
const ALL_ACCOUNTS_OPTION: OptionType = {
  label: "All Organizations",
  value: ALL_ACCOUNTS_VALUE,
};
const ALL_VEHICLES_OPTION: OptionType = {
  label: "All Vehicles",
  value: ALL_VEHICLES_VALUE,
};

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

const formatMinutes = (value?: number) => {
  const totalMinutes = Number(value || 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

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
  });
};

const formatDateOnly = (value?: string) => {
  if (!value) return "NA";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
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

const RunReportPage = () => {
  const { isDark } = useTheme();
  const [accounts, setAccounts] = useState<OptionType[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<OptionType[]>([]);
  const [vehicles, setVehicles] = useState<OptionType[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<OptionType[]>([]);
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
  const [data, setData] = useState<RunReportRow[]>([]);
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
              (account: { id?: number | string; value?: string; label?: string }) => ({
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
                  vehicleOptions.some((option) => option.value === vehicle.value),
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

    if (!orgIds.length) {
      toast.error("Please select at least one organization");
      return;
    }

    try {
      setLoading(true);
      const response = await javaApi.post("reports/daily-report", {
        orgIds,
        vehicleIds,
        start: toApiDateTime(startDate),
        end: toApiDateTime(endDate),
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
        error?.response?.data?.message || "Failed to load run report",
      );
    } finally {
      setLoading(false);
    }
  };

  const accountNameById = new Map(
    accounts
      .filter((account) => account.value !== ALL_ACCOUNTS_VALUE)
      .map((account) => [Number(account.value), account.label]),
  );

  const handleExport = () => {
    if (!data.length) {
      toast.info("No record found");
      return;
    }

    const rows = data.map((row) => ({
      Organization:
        row.orgName ||
        (row.orgId ? accountNameById.get(Number(row.orgId)) : "") ||
        "Run Report",
      Vehicle: row.vehicleNo || "NA",
      "Report Date": formatDateOnly(row.reportDate),
      "First Data Time": formatDateTime(row.firstDataTime),
      "Last Data Time": formatDateTime(row.lastDataTime),
      "Distance (KM)":
        row.distanceKm !== undefined ? Number(row.distanceKm).toFixed(2) : "NA",
      "Moving Time": formatMinutes(row.movingTimeMinutes),
      "Idle Time": formatMinutes(row.idleTimeMinutes),
      "Ignition On": formatMinutes(row.ignitionOnMinutes),
      "AC On": formatMinutes(row.acOnMinutes),
      Efficiency:
        row.fleetEfficiency !== undefined ? `${row.fleetEfficiency}%` : "NA",
      "Start Address": row.startAddress || "NA",
      "End Address": row.endAddress || "NA",
    }));

    const headers = Object.keys(rows[0]);
    const tableRows = rows
      .map(
        (row) =>
          `<tr>${headers
            .map((header) => `<td>${escapeHtml(row[header as keyof typeof row])}</td>`)
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
              <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
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
    link.download = `run-report-${stamp}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  };

  const totalDistance = data.reduce(
    (sum, row) => sum + Number(row.distanceKm || 0),
    0,
  );
  const avgMovingMinutes = data.length
    ? data.reduce((sum, row) => sum + Number(row.movingTimeMinutes || 0), 0) /
      data.length
    : 0;
  const avgIdleMinutes = data.length
    ? data.reduce((sum, row) => sum + Number(row.idleTimeMinutes || 0), 0) /
      data.length
    : 0;
  const avgFleetEfficiency = data.length
    ? data.reduce((sum, row) => sum + Number(row.fleetEfficiency || 0), 0) /
      data.length
    : 0;

  const filteredData = data.filter((row) => {
    if (!searchQuery.trim()) return true;
    const haystack = [
      row.orgName,
      row.vehicleNo,
      row.reportDate,
      row.firstDataTime,
      row.lastDataTime,
      row.startAddress,
      row.endAddress,
      row.distanceKm,
      row.movingTimeMinutes,
      row.idleTimeMinutes,
      row.ignitionOnMinutes,
      row.acOnMinutes,
      row.fleetEfficiency,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-4 mt-10">
      <ActionLoader isVisible={loading} text="Loading run report..." />
      <PageHeader
        title="Run Report"
        breadcrumbs={[
          { label: "Operations", href: "/operations" },
          { label: "Reports", href: "/report" },
          { label: "Run Report" },
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
        <div className="grid items-start gap-4 p-5 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.15fr)_minmax(260px,1.2fr)_minmax(190px,0.9fr)_minmax(190px,0.9fr)_auto]">
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
          label="Total Distance"
          value={`${totalDistance.toFixed(2)} KM`}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          isDark={isDark}
        />
        <MetricCard
          icon={Clock}
          label="Avg Moving Time"
          value={formatMinutes(Math.round(avgMovingMinutes))}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          isDark={isDark}
        />
        <MetricCard
          icon={TrendingUp}
          label="Avg Idle Time"
          value={formatMinutes(Math.round(avgIdleMinutes))}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          isDark={isDark}
        />
        <MetricCard
          icon={Shield}
          label="Avg Fleet Efficiency"
          value={`${avgFleetEfficiency.toFixed(0)}%`}
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

        <div className="overflow-hidden rounded-[24px] border border-slate-200">
          <div className="grid grid-cols-[1.05fr_0.95fr_0.9fr_0.9fr_0.8fr_0.8fr_0.8fr_1.6fr] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-600">
            <div>Vehicle</div>
            <div>Report Date</div>
            <div>First Data</div>
            <div>Last Data</div>
            <div>Dist. (KM)</div>
            <div>Moving</div>
            <div>Idle</div>
            <div>Journey</div>
          </div>

          {filteredData.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm font-medium text-slate-500">
              {emptyMessage}
            </div>
          ) : (
            filteredData.map((row, index) => (
              <div
                key={`${row.vehicleId || row.vehicleNo || "row"}-${index}`}
                className="grid grid-cols-[1.05fr_0.95fr_0.9fr_0.9fr_0.8fr_0.8fr_0.8fr_1.6fr] gap-4 border-b border-slate-200 px-6 py-5 last:border-b-0"
              >
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {row.vehicleNo || "NA"}
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    {row.orgName ||
                      (row.orgId
                        ? accountNameById.get(Number(row.orgId)) || `Org ${row.orgId}`
                        : "Run Report")}
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {formatDateOnly(row.reportDate)}
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {formatDateTime(row.firstDataTime)}
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {formatDateTime(row.lastDataTime)}
                </div>
                <div className="text-lg font-bold text-violet-600">
                  {row.distanceKm !== undefined
                    ? Number(row.distanceKm).toFixed(2)
                    : "NA"}
                </div>
                <div className="text-lg font-semibold text-emerald-600">
                  {formatMinutes(row.movingTimeMinutes)}
                </div>
                <div className="text-lg font-semibold text-amber-600">
                  {formatMinutes(row.idleTimeMinutes)}
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  <div>
                    <span className="font-semibold text-emerald-600">Start:</span>{" "}
                    {row.startAddress || formatDateTime(row.firstDataTime)}
                    {getGoogleMapsLink(row.startLatitude, row.startLongitude) && (
                      <>
                        {" "}
                        <a
                          href={getGoogleMapsLink(
                            row.startLatitude,
                            row.startLongitude,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                        >
                          Open map
                        </a>
                      </>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-rose-500">End:</span>{" "}
                    {row.endAddress || formatDateTime(row.lastDataTime)}
                    {getGoogleMapsLink(row.endLatitude, row.endLongitude) && (
                      <>
                        {" "}
                        <a
                          href={getGoogleMapsLink(
                            row.endLatitude,
                            row.endLongitude,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                        >
                          Open map
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RunReportPage;
