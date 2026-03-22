"use client";
import React, { useEffect, useState } from "react";
import { Activity, Clock, TrendingUp, Shield } from "lucide-react";
import dynamic from "next/dynamic";
import type { SearchableOption } from "@/components/SearchableDropdown";
const SearchableDropdown = dynamic(() => import("@/components/SearchableDropdown"), { ssr: false });
import TableHeader from "@/components/TableHeader";
import CommonTable from "@/components/CommonTable";
import { getVehicleDropdown } from "@/services/commonServie";
import { toast } from "react-toastify";
import api from "@/services/apiService";

const MovementReportPage = () => {
  const [organizations, setOrganizations] = useState<SearchableOption[]>([]);
  const [selectedOrganization, setSelectedOrganization] =
    useState<SearchableOption | null>(null);
  const [vehicles, setVehicles] = useState<SearchableOption[]>([]);
  const [selectedVehicle, setSelectedVehicle] =
    useState<SearchableOption | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const res = await api.get("/api/common/dropdowns/accounts");
        const orgOptions: SearchableOption[] = [
          { label: "All Company", value: "all" },
          ...((res?.data || []) as Array<{ label?: string; value?: string | number }>).map(
            (org) => ({
              label: org.label || "Unknown",
              value: String(org.value ?? ""),
            }),
          ),
        ];
        setOrganizations(orgOptions);
        setSelectedOrganization(orgOptions[0] ?? null);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to load organizations");
      }
    };
    fetchOrganizations();
  }, []);

  const fetchVehiclesForOrganization = async (
    org: SearchableOption | null,
  ) => {
    try {
      const accountId =
        org && org.value !== "all" ? String(org.value) : undefined;
      const res = await getVehicleDropdown(accountId);
      const vehicleList = Array.isArray(res?.data) ? res.data : [];
      const vehicleOptions: SearchableOption[] = [
        { label: "All Vehicle", value: "all" },
        ...vehicleList.map((vehicle: { label?: string; value?: string | number }) => ({
          label: vehicle.label || "Unknown",
          value: String(vehicle.value ?? ""),
        })),
      ];
      setVehicles(vehicleOptions);
      setSelectedVehicle(vehicleOptions[0] ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load vehicles");
    }
  };

  useEffect(() => {
    if (selectedOrganization) {
      fetchVehiclesForOrganization(selectedOrganization);
    }
  }, [selectedOrganization]);

  const columns: import("@/interfaces/table.interface").Column[] = [
    { key: "vehicleNo", label: "Vehicle", type: "text" },
    { key: "distanceKm", label: "Dist. (KM)", type: "text" },
    { key: "moving", label: "Moving", type: "text" },
    { key: "idle", label: "Idle", type: "text" },
    { key: "parked", label: "Parked", type: "text" },
    { key: "journey", label: "Journey", type: "text" },
    { key: "speed", label: "Speed", type: "text" },
    { key: "alerts", label: "Alerts", type: "text" },
  ];

  return (
    <div className="p-4">
      <TableHeader
        title="Movement Report"
        breadcrumbs={[
          { label: "Operations", href: "/operations" },
          { label: "Reports", href: "/report" },
          { label: "Movement Report" },
        ]}
      />
      {/* Filter Row */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-col sm:flex-row items-end gap-4">
        <div className="w-full sm:w-64">
          <SearchableDropdown
            options={organizations}
            value={selectedOrganization}
            onChange={(option) => {
              setSelectedOrganization(option);
            }}
            placeholder="All Company"
          />
        </div>
        <div className="w-full sm:w-64">
          <SearchableDropdown
            options={vehicles}
            value={selectedVehicle}
            onChange={(option) => {
              setSelectedVehicle(option);
            }}
            placeholder="All Vehicle"
          />
        </div>
        <div className="w-full sm:w-48">
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="From Date"
          />
        </div>
        <div className="w-full sm:w-48">
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="To Date"
          />
        </div>
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-60 w-full sm:w-auto"
          onClick={() => {}}
          disabled={loading}
        >
          {loading ? "Loading..." : "View Report"}
        </button>
      </div>
      {/* Summary Cards */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 bg-white rounded-2xl shadow p-6 flex items-center gap-4 min-w-[220px]">
          <div className="bg-violet-100 rounded-xl p-3 flex items-center justify-center">
            <Activity className="text-violet-500 w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Distance</div>
            <div className="text-2xl font-bold text-gray-900">233.7 KM</div>
          </div>
        </div>
        <div className="flex-1 bg-white rounded-2xl shadow p-6 flex items-center gap-4 min-w-[220px]">
          <div className="bg-green-100 rounded-xl p-3 flex items-center justify-center">
            <Clock className="text-green-500 w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avg Moving Time</div>
            <div className="text-2xl font-bold text-gray-900">3h 15m</div>
          </div>
        </div>
        <div className="flex-1 bg-white rounded-2xl shadow p-6 flex items-center gap-4 min-w-[220px]">
          <div className="bg-violet-100 rounded-xl p-3 flex items-center justify-center">
            <TrendingUp className="text-violet-500 w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fleet Efficiency</div>
            <div className="text-2xl font-bold text-gray-900">92.4%</div>
          </div>
        </div>
        <div className="flex-1 bg-white rounded-2xl shadow p-6 flex items-center gap-4 min-w-[220px]">
          <div className="bg-red-100 rounded-xl p-3 flex items-center justify-center">
            <Shield className="text-red-500 w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Safety Violations</div>
            <div className="text-2xl font-bold text-gray-900">02 Total</div>
          </div>
        </div>
      </div>
      <CommonTable
        columns={columns}
        data={data.map((row) => ({
          vehicleNo: row.vehicleNo ?? "NA",
          distanceKm: row.distanceKm ?? "NA",
          moving: row.moving ?? "NA",
          idle: row.idle ?? "NA",
          parked: row.parked ?? "NA",
          journey: row.journey ?? "NA",
          speed: row.speed ?? "NA",
          alerts: row.alerts ?? "NA",
        }))}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isServerSide={false}
        totalRecords={data.length}
        pageNo={1}
        pageSize={data.length || 10}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />
    </div>
  );
};
export default MovementReportPage;
