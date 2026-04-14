"use client";
import React, { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Download,
  Search,
  MapPin,
} from "lucide-react";
import ActionLoader from "@/components/ActionLoader";
import { MetricCard } from "@/components/CommonCard";
import PageHeader from "@/components/PageHeader";
import MultiSelect, { OptionType } from "@/components/MultiSelect";
import { useTheme } from "@/context/ThemeContext";
import { getAllAccounts, getVehicleDropdown } from "@/services/commonServie";
import { toast } from "react-toastify";
import { javaApi } from "@/services/apiService";
import {
  downloadReportAsCsv,
  downloadReportAsXlsx,
} from "@/utils/reportExport";

type GeofenceReportRow = {
  orgId?: number;
  orgName?: string;
  vehicleId?: string;
  vehicleNo?: string;
  deviceNo?: string;
  gpsDate?: string;
  geoId?: string;
  latitude?: number;
  longitude?: number;
  address?: string | null;
  geoName?: string;
  geoStatus?: string;
  receivedAt?: string;
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

const normalizeDisplayValue = (value?: string | null) => {
  if (typeof value !== "string") return "";

  const normalized = value.trim();
  if (!normalized) return "";

  const lowerValue = normalized.toLowerCase();
  if (lowerValue === "undefined" || lowerValue === "null") {
    return "";
  }

  return normalized;
};

const getStatusBadgeStyle = (status?: string) => {
  const baseClass = "inline-flex px-2 py-1 rounded-full text-xs font-semibold";
  switch (status?.toUpperCase()) {
    case "ENTER":
      return `${baseClass} bg-emerald-100 text-emerald-800`;
    case "EXIT":
      return `${baseClass} bg-red-100 text-red-800`;
    default:
      return `${baseClass} bg-slate-100 text-slate-800`;
  }
};

type ExportFormat = "excel" | "csv";

const GeofenceReportPage = () => {
  const { isDark } = useTheme();
  const maxSelectableDateTime = toDateTimeLocalValue(
    new Date(new Date().setHours(23, 59, 0, 0)),
  );
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
  const [data, setData] = useState<GeofenceReportRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [emptyMessage, setEmptyMessage] = useState("No record found");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("excel");

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
        vehicleOptions.length ? [...vehicleOptions] : [],
      );
      setSelectedVehicles((previous) =>
        previous.filter((vehicle) =>
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
    const nextAccountsWithoutAll = nextAccounts.filter(
      (account) => account.value !== ALL_ACCOUNTS_VALUE,
    );

    if (!hadAllSelected && hasAllSelected) {
      setSelectedAccounts([ALL_ACCOUNTS_OPTION, ...realAccounts]);
      return;
    }

    if (hadAllSelected && !hasAllSelected) {
      if (nextAccountsWithoutAll.length === realAccounts.length) {
        setSelectedAccounts([]);
        return;
      }
      setSelectedAccounts(nextAccountsWithoutAll);
      return;
    }

    if (
      nextAccountsWithoutAll.length === realAccounts.length &&
      realAccounts.length > 0
    ) {
      setSelectedAccounts([ALL_ACCOUNTS_OPTION, ...realAccounts]);
      return;
    }

    setSelectedAccounts(nextAccountsWithoutAll);
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
    const nextVehiclesWithoutAll = nextVehicles.filter(
      (vehicle) => vehicle.value !== ALL_VEHICLES_VALUE,
    );

    if (!hadAllSelected && hasAllSelected) {
      setSelectedVehicles([ALL_VEHICLES_OPTION, ...realVehicles]);
      return;
    }

    if (hadAllSelected && !hasAllSelected) {
      if (nextVehiclesWithoutAll.length === realVehicles.length) {
        setSelectedVehicles([]);
        return;
      }
      setSelectedVehicles(nextVehiclesWithoutAll);
      return;
    }

    if (
      nextVehiclesWithoutAll.length === realVehicles.length &&
      realVehicles.length > 0
    ) {
      setSelectedVehicles([ALL_VEHICLES_OPTION, ...realVehicles]);
      return;
    }

    setSelectedVehicles(nextVehiclesWithoutAll);
  };

  const handleViewReport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 0, 0);
    const endOfTodayTime = endOfToday.getTime();
    if (
      new Date(startDate).getTime() > endOfTodayTime ||
      new Date(endDate).getTime() > endOfTodayTime
    ) {
      toast.error("Future date cannot be selected");
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
      .map((vehicle) => Number(vehicle.value))
      .filter((value) => Number.isFinite(value) && value > 0);

    setLoading(true);
    try {
      const payload = {
        orgIds,
        vehicleIds,
        start: toApiDateTime(startDate),
        end: toApiDateTime(endDate),
      };

      const response = await javaApi.post(
        "reports/history-geofence",
        payload,
      );

      const isValid = response?.data?.valid !== false;
      const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
      const noDataMessage =
        String(response?.data?.message || "").trim() || "No record found";

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
        error?.response?.data?.message || "Failed to load geofence report",
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

  const getExportRows = () =>
    data.map((row) => ({
      Organization:
        normalizeDisplayValue(row.orgName) ||
        (row.orgId ? accountNameById.get(Number(row.orgId)) : "") ||
        "Geofence Report",
      Vehicle: row.vehicleNo || "NA",
      "Device No": row.deviceNo || "NA",
      "Geo Name": row.geoName || "NA",
      "Geo Status": row.geoStatus || "NA",
      "GPS Date": formatDateTime(row.gpsDate),
      Address: normalizeDisplayValue(row.address) || "NA",
      Latitude: row.latitude || "NA",
      Longitude: row.longitude || "NA",
      "Received At": formatDateTime(row.receivedAt),
    }));

  const handleExport = () => {
    if (!data.length) {
      toast.info("No record found");
      return;
    }

    const rows = getExportRows();
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");

    if (exportFormat === "csv") {
      downloadReportAsCsv(rows, `geofence-report-${stamp}.csv`);
    } else {
      downloadReportAsXlsx(rows, `geofence-report-${stamp}.xlsx`);
    }

    toast.success("Export downloaded");
  };

  const filteredData = data.filter((row) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return true;

    const organizationName =
      normalizeDisplayValue(row.orgName) ||
      (row.orgId ? accountNameById.get(Number(row.orgId)) : "") ||
      (row.orgId ? `Org ${row.orgId}` : "Geofence Report");

    const haystack = [
      organizationName,
      row.vehicleNo,
      row.deviceNo,
      row.geoName,
      row.geoStatus,
      formatDateTime(row.gpsDate),
      normalizeDisplayValue(row.address) || "NA",
      String(row.latitude || ""),
      String(row.longitude || ""),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  return (
    <div className="p-4 mt-10">
      <ActionLoader isVisible={loading} text="Loading geofence report..." />
      <PageHeader
        title="Geofence Report"
        breadcrumbs={[
          { label: "Operations", href: "/operations" },
          { label: "Reports", href: "/report" },
          { label: "Geofence Report" },
        ]}
        showButton={true}
        buttonText={loading ? "Loading..." : "View Report"}
        onButtonClick={() => {
          if (!loading) handleViewReport();
        }}
        showExportButton={true}
        ExportbuttonText="Export"
        onExportClick={handleExport}
        exportFormat={exportFormat}
        onExportFormatChange={setExportFormat}
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
              name="All Accounts"
            />
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              Vehicle
            </div>
            <MultiSelect
              options={vehicles}
              value={selectedVehicles}
              onChange={handleVehicleChange}
              placeholder="Select Vehicle"
              searchPlaceholder="Search vehicle..."
              isDisabled={!selectedAccounts.length}
              name="All Vehicles"
            />
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              From Date
            </div>
            <input
              type="datetime-local"
              max={maxSelectableDateTime}
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
              max={maxSelectableDateTime}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date & Time"
            />
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <MetricCard
          icon={MapPin}
          label="Total Events"
          value={data.length}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          isDark={isDark}
        />
        <MetricCard
          icon={Building2}
          label="Total Vehicles"
          value={new Set(data.map((d) => d.vehicleNo)).size}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
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

        <div className="overflow-visible rounded-[24px] border border-slate-200">
          <div className="grid grid-cols-[1.2fr_0.9fr_0.85fr_0.8fr_0.75fr_1fr_1.1fr] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-slate-600">
            <div>Vehicle</div>
            <div>Device No</div>
            <div>Geo Name</div>
            <div>Status</div>
            <div>GPS Time</div>
            <div>Address</div>
            <div>Location</div>
          </div>

          {filteredData.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm font-medium text-slate-500">
              {emptyMessage}
            </div>
          ) : (
            filteredData.map((row, index) => (
              <div
                key={`${row.vehicleId || row.vehicleNo || "row"}-${index}`}
                className="grid grid-cols-[1.2fr_0.9fr_0.85fr_0.8fr_0.75fr_1fr_1.1fr] gap-4 border-b border-slate-200 px-6 py-5 last:border-b-0"
              >
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {row.vehicleNo || "NA"}
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    {normalizeDisplayValue(row.orgName) ||
                      (row.orgId
                        ? accountNameById.get(Number(row.orgId)) || `Org ${row.orgId}`
                        : "Geofence Report")}
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {row.deviceNo || "NA"}
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {row.geoName || "NA"}
                </div>
                <div>
                  <span className={getStatusBadgeStyle(row.geoStatus)}>
                    {row.geoStatus || "NA"}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {formatDateTime(row.gpsDate)}
                </div>
                <div className="text-sm text-slate-600">
                  {normalizeDisplayValue(row.address) || "NA"}
                </div>
                <div className="text-sm">
                  {getGoogleMapsLink(row.latitude, row.longitude) ? (
                    <a
                      href={getGoogleMapsLink(row.latitude, row.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 font-semibold"
                    >
                      <MapPin className="h-4 w-4" />
                      Open Map
                    </a>
                  ) : (
                    <span className="text-slate-400">NA</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GeofenceReportPage;
