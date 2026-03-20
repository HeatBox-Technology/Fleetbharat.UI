"use client";

import { DirectionsRenderer, GoogleMap } from "@react-google-maps/api";
import {
  AlertCircle,
  ArrowLeft,
  Clock3,
  Flag,
  Map as MapIcon,
  MapPin,
  Navigation,
  Plus,
  Route as RouteIcon,
  Save,
  Trash2,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import SearchableDropdown, {
  type SearchableOption,
} from "@/components/SearchableDropdown";
import { useGoogleMapsSdk } from "@/hooks/useGoogleMapsSdk";
import { getAccountHierarchy } from "@/services/accountService";
import { getGeofenceDropdownByAccount } from "@/services/commonServie";
import { getRouteDropdown } from "@/services/tripMasterService";

type NodeType = "START" | "VIA" | "END";

interface RouteNode {
  id: string;
  type: NodeType;
  geofence: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  plannedEntry: string;
  plannedExit: string;
  distanceFromPrev: number;
  timeFromPrev: number;
  haltTime: number;
}

interface AccountOption {
  id: number;
  value: string;
}

const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const VEHICLES = [
  { label: "ABC-1234 - FleetCorp", reg: "ABC-1234", device: "ELOCK-ALPHA-01" },
  {
    label: "XYZ-5678 - LogisticsPlus",
    reg: "XYZ-5678",
    device: "ELOCK-BETA-02",
  },
  {
    label: "DEF-9012 - TransportCo",
    reg: "DEF-9012",
    device: "ELOCK-GAMMA-03",
  },
];

const DEVICES = [
  "ELOCK-ALPHA-01",
  "ELOCK-BETA-02",
  "ELOCK-GAMMA-03",
  "ELOCK-DELTA-04",
];

const PARTIES = [
  { name: "Global Logistics Solutions", phone: "+91 99999 88888" },
  { name: "FastTrack Express", phone: "+91 77777 66666" },
  { name: "Metro Distribution", phone: "+91 88888 77777" },
];
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

const cn = (...classes: (string | undefined | boolean)[]) =>
  classes.filter(Boolean).join(" ");

const toSearchableOptions = (values: string[]): SearchableOption[] =>
  values.map((value) => ({ value, label: value }));

const toServiceDropdownOptions = (response: any): SearchableOption[] => {
  const data = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : [];

  return data
    .map((item: any) => ({
      value: String(item?.id ?? item?.value ?? ""),
      label: String(item?.value ?? item?.name ?? item?.label ?? ""),
    }))
    .filter((item: SearchableOption) => item.value && item.label);
};

const getUserAccountId = (): number => {
  if (typeof window === "undefined") return 0;
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return Number(user?.accountId || 0);
  } catch {
    return 0;
  }
};

const SectionHeader = ({
  number,
  title,
}: {
  number: number;
  title: string;
}) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
      {number}.
    </div>
    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
      {title}
    </h2>
  </div>
);

const Label = ({ text, required }: { text: string; required?: boolean }) => (
  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
    {text}
    {required && <span className="text-red-500">*</span>}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cn(
      "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all",
      props.className,
    )}
  />
);

export default function TripPlannerPage() {
  const router = useRouter();
  const { isLoaded, loadError } = useGoogleMapsSdk();
  const mapRef = useRef<google.maps.Map | null>(null);

  // States - Shipment Details
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
  const [assignedDriver, setAssignedDriver] = useState("");
  const [tripType, setTripType] = useState("");

  // States - Routing & Schedule
  const [routingModel, setRoutingModel] = useState<"standard" | "dynamic">(
    "standard",
  );
  const [frequency, setFrequency] = useState<"recurring" | "one-time">(
    "recurring",
  );
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
  ]);
  const [oneTimeDate, setOneTimeDate] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [routeMasterOptions, setRouteMasterOptions] = useState<
    SearchableOption[]
  >([]);

  // States - Asset Allocation
  const [vehicleMode, setVehicleMode] = useState<"master" | "adhoc">("master");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [adhocRegNo, setAdhocRegNo] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState("");
  const [assetOwner, setAssetOwner] = useState("");
  const [primaryDevice, setPrimaryDevice] = useState("");
  const [secondaryDevice, setSecondaryDevice] = useState("");

  // States - Route Nodes
  const [nodes, setNodes] = useState<RouteNode[]>([
    {
      id: "1",
      type: "START",
      geofence: "Delhi Gateway Terminal",
      address: "Mahipalpur, New Delhi",
      latitude: null,
      longitude: null,
      plannedEntry: "10:00",
      plannedExit: "11:00",
      distanceFromPrev: 0,
      timeFromPrev: 0,
      haltTime: 30,
    },
    {
      id: "2",
      type: "END",
      geofence: "Pune Logistics Park",
      address: "Hinjewadi Phase 3, Pune",
      latitude: null,
      longitude: null,
      plannedEntry: "18:00",
      plannedExit: "19:00",
      distanceFromPrev: 1450,
      timeFromPrev: 1800,
      haltTime: 60,
    },
  ]);
  const [showAutocomplete, setShowAutocomplete] = useState<string | null>(null);
  const [locationPredictions, setLocationPredictions] = useState<
    Record<string, google.maps.places.AutocompletePrediction[]>
  >({});
  const [geofenceOptions, setGeofenceOptions] = useState<SearchableOption[]>(
    [],
  );
  const [directionsResult, setDirectionsResult] =
    useState<google.maps.DirectionsResult | null>(null);
  const [mapPreviewLoading, setMapPreviewLoading] = useState(false);

  // States - Pickup & Delivery
  const [consignor, setConsignor] = useState("");
  const [consignee, setConsignee] = useState("");

  const driverOptions = useMemo(
    () => toSearchableOptions(["John Doe", "Jane Smith", "Mike Ross"]),
    [],
  );
  const accountOptions = useMemo<SearchableOption[]>(
    () =>
      accounts.map((acc) => ({
        value: Number(acc.id),
        label: acc.value,
      })),
    [accounts],
  );
  const tripTypeOptions = useMemo(
    () => toSearchableOptions(["E-lock", "GPS", "Camera"]),
    [],
  );
  const vehicleAssetOptions = useMemo(
    () => toSearchableOptions(VEHICLES.map((v) => v.label)),
    [],
  );
  const vehicleCategoryOptions = useMemo(
    () => toSearchableOptions(["Truck", "Van", "Trailer"]),
    [],
  );
  const deviceOptions = useMemo(() => toSearchableOptions(DEVICES), []);
  const partyOptions = useMemo(
    () =>
      PARTIES.map((party) => ({
        value: party.name,
        label: `${party.name} (${party.phone})`,
      })),
    [],
  );

  // Computed Values
  const totalDistance = useMemo(
    () => nodes.reduce((sum, n) => sum + n.distanceFromPrev, 0),
    [nodes],
  );

  const selectedVehicleData = VEHICLES.find((v) => v.label === selectedVehicle);
  const selectedAccountOption =
    accountOptions.find(
      (opt) => Number(opt.value) === Number(selectedAccountId),
    ) || null;
  const selectedDriverOption =
    driverOptions.find((opt) => String(opt.value) === assignedDriver) || null;
  const selectedTripTypeOption =
    tripTypeOptions.find((opt) => String(opt.value) === tripType) || null;
  const selectedVehicleOption =
    vehicleAssetOptions.find((opt) => String(opt.value) === selectedVehicle) ||
    null;
  const selectedVehicleCategoryOption =
    vehicleCategoryOptions.find(
      (opt) => String(opt.value) === vehicleCategory,
    ) || null;
  const currentDevice =
    vehicleMode === "master" && selectedVehicleData
      ? selectedVehicleData.device
      : primaryDevice;
  const selectedPrimaryDeviceOption =
    deviceOptions.find((opt) => String(opt.value) === currentDevice) || null;
  const selectedSecondaryDeviceOption =
    deviceOptions.find((opt) => String(opt.value) === secondaryDevice) || null;
  const selectedRouteOption =
    routeMasterOptions.find((opt) => String(opt.value) === selectedRoute) ||
    null;
  const selectedConsignorOption =
    partyOptions.find((opt) => String(opt.value) === consignor) || null;
  const selectedConsigneeOption =
    partyOptions.find((opt) => String(opt.value) === consignee) || null;

  // Functions
  const addViaNode = (index: number) => {
    const newNode: RouteNode = {
      id: Math.random().toString(36).slice(2, 9),
      type: "VIA",
      geofence: "",
      address: "",
      latitude: null,
      longitude: null,
      plannedEntry: "",
      plannedExit: "",
      distanceFromPrev: 0,
      timeFromPrev: 0,
      haltTime: 15,
    };
    const newNodes = [...nodes];
    newNodes.splice(index + 1, 0, newNode);
    setNodes(newNodes);
  };

  const removeNode = (id: string) => {
    if (nodes.length <= 2) return;
    setNodes(nodes.filter((n) => n.id !== id));
  };

  const updateNode = (id: string, updates: Partial<RouteNode>) => {
    setNodes(nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const fetchLocationPredictions = (nodeId: string, input: string) => {
    if (routingModel !== "dynamic") return;
    if (!isLoaded || !window?.google?.maps?.places) return;
    const query = input.trim();
    if (query.length < 3) {
      setLocationPredictions((prev) => ({ ...prev, [nodeId]: [] }));
      return;
    }

    const service = new window.google.maps.places.AutocompleteService();
    service.getPlacePredictions(
      {
        input: query,
      },
      (predictions, status) => {
        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !predictions
        ) {
          setLocationPredictions((prev) => ({ ...prev, [nodeId]: [] }));
          return;
        }
        setLocationPredictions((prev) => ({ ...prev, [nodeId]: predictions }));
      },
    );
  };

  const applyLocationToNode = async (
    nodeId: string,
    prediction: google.maps.places.AutocompletePrediction,
  ) => {
    if (!window?.google?.maps) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      { placeId: prediction.place_id },
      (results, status: google.maps.GeocoderStatus) => {
        if (status !== "OK" || !results?.[0]) {
          updateNode(nodeId, {
            geofence: prediction.description,
            address: prediction.description,
          });
          setShowAutocomplete(null);
          return;
        }

        const result = results[0];
        const loc = result.geometry?.location;
        updateNode(nodeId, {
          geofence: prediction.description,
          address: result.formatted_address || prediction.description,
          latitude: loc ? loc.lat() : null,
          longitude: loc ? loc.lng() : null,
        });
        setLocationPredictions((prev) => ({ ...prev, [nodeId]: [] }));
        setShowAutocomplete(null);
      },
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const toggleAllDays = () => {
    if (selectedDays.length === 7) {
      setSelectedDays([]);
    } else {
      setSelectedDays(WEEK_DAYS);
    }
  };

  const areNodesValid = nodes.every(
    (node) => node.geofence && node.plannedEntry && node.plannedExit,
  );
  const isFormValid = !!(
    selectedAccountId > 0 &&
    assignedDriver &&
    tripType &&
    (vehicleMode === "master" ? selectedVehicle : adhocRegNo) &&
    currentDevice &&
    areNodesValid &&
    (frequency === "recurring" ? selectedDays.length > 0 : oneTimeDate)
  );

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await getAccountHierarchy();
        const accountRows = Array.isArray(response?.data) ? response.data : [];
        setAccounts(
          accountRows.map((item: any) => ({
            id: Number(item?.id || 0),
            value: String(item?.value || item?.name || item?.id || ""),
          })),
        );
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };

    fetchAccounts();
    const accountId = getUserAccountId();
    if (accountId > 0) {
      setSelectedAccountId(accountId);
    }
  }, []);

  useEffect(() => {
    const accountId = Number(selectedAccountId || 0);
    if (accountId <= 0) {
      setRouteMasterOptions([]);
      setGeofenceOptions([]);
      return;
    }

    const fetchDropdowns = async () => {
      try {
        const [routeRes, geofenceRes] = await Promise.all([
          getRouteDropdown(accountId),
          getGeofenceDropdownByAccount(accountId),
        ]);
        setRouteMasterOptions(toServiceDropdownOptions(routeRes));
        setGeofenceOptions(toServiceDropdownOptions(geofenceRes));
      } catch (error) {
        console.error("Error fetching route/geofence dropdowns:", error);
      }
    };

    fetchDropdowns();
  }, [selectedAccountId]);

  useEffect(() => {
    if (routingModel === "dynamic") return;
    setShowAutocomplete(null);
    setLocationPredictions({});
  }, [routingModel]);

  useEffect(() => {
    if (!isLoaded || !window?.google?.maps) return;

    const routePoints = nodes
      .map((node) => {
        if (
          typeof node.latitude === "number" &&
          typeof node.longitude === "number"
        ) {
          return { lat: node.latitude, lng: node.longitude };
        }
        const fallback = node.geofence.trim();
        return fallback.length > 0 ? fallback : null;
      })
      .filter(Boolean) as (string | google.maps.LatLngLiteral)[];

    if (routePoints.length < 2) {
      setDirectionsResult(null);
      return;
    }

    const calculatePreviewRoute = async () => {
      try {
        setMapPreviewLoading(true);
        const directionsService = new window.google.maps.DirectionsService();
        const response = await directionsService.route({
          origin: routePoints[0],
          destination: routePoints[routePoints.length - 1],
          waypoints: routePoints.slice(1, -1).map((location) => ({
            location,
            stopover: true,
          })),
          optimizeWaypoints: false,
          travelMode: window.google.maps.TravelMode.DRIVING,
        });
        setDirectionsResult(response);
      } catch (error) {
        console.error("Map preview route error:", error);
        setDirectionsResult(null);
      } finally {
        setMapPreviewLoading(false);
      }
    };

    calculatePreviewRoute();
  }, [isLoaded, nodes]);

  useEffect(() => {
    if (!mapRef.current || !directionsResult?.routes?.[0]?.bounds) return;
    mapRef.current.fitBounds(directionsResult.routes[0].bounds);
  }, [directionsResult]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-full px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Operations Control
              </p>
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 uppercase tracking-tight">
                Trip Planner
              </h1>
            </div>
            <button
              onClick={() => router.back()}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 lg:px-8 py-8">
        <div className="space-y-6 mb-12">
          {/* Section 1: Shipment Details */}
          <section className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <SectionHeader number={1} title="Shipment Details" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                <Label text="Account" required />
                <SearchableDropdown
                  options={accountOptions}
                  value={selectedAccountOption}
                  onChange={(option) =>
                    setSelectedAccountId(Number(option?.value || 0))
                  }
                  placeholder="Select account..."
                  isDark={false}
                  isClearable={false}
                />
              </div>
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                <Label text="Assigned Driver" required />
                <SearchableDropdown
                  options={driverOptions}
                  value={selectedDriverOption}
                  onChange={(option) =>
                    setAssignedDriver(String(option?.value || ""))
                  }
                  placeholder="Select driver..."
                  isDark={false}
                  isClearable={false}
                />
              </div>
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                <Label text="Trip Type" required />
                <SearchableDropdown
                  options={tripTypeOptions}
                  value={selectedTripTypeOption}
                  onChange={(option) =>
                    setTripType(String(option?.value || ""))
                  }
                  placeholder="Select type..."
                  isDark={false}
                  isClearable={false}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Asset Allocation */}
          <section className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <SectionHeader number={2} title="Asset Allocation" />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <Label text="Fleet Source" />
                  <div className="inline-flex rounded-xl p-1 bg-slate-100">
                    <button
                      type="button"
                      onClick={() => setVehicleMode("master")}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all",
                        vehicleMode === "master"
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-800",
                      )}
                    >
                      INTERNAL FLEET
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleMode("adhoc")}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all",
                        vehicleMode === "adhoc"
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-800",
                      )}
                    >
                      EXTERNAL/ADHOC
                    </button>
                  </div>
                </div>

                {vehicleMode === "master" ? (
                  <>
                    <div>
                      <Label text="Vehicle Asset" required />
                      <SearchableDropdown
                        options={vehicleAssetOptions}
                        value={selectedVehicleOption}
                        onChange={(option) =>
                          setSelectedVehicle(String(option?.value || ""))
                        }
                        placeholder="Select Vehicle..."
                        isDark={false}
                        isClearable={false}
                      />
                    </div>
                    <div>
                      <Label text="Registration Number" />
                      <Input
                        value={selectedVehicleData?.reg || ""}
                        readOnly
                        className="bg-slate-50 font-bold text-slate-500 border-slate-100"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label text="Vehicle Registration No." required />
                      <Input
                        placeholder="Enter Reg No."
                        value={adhocRegNo}
                        onChange={(e) => setAdhocRegNo(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label text="Vehicle Category" />
                        <SearchableDropdown
                          options={vehicleCategoryOptions}
                          value={selectedVehicleCategoryOption}
                          onChange={(option) =>
                            setVehicleCategory(String(option?.value || ""))
                          }
                          placeholder="Select Category..."
                          isDark={false}
                          isClearable={false}
                        />
                      </div>
                      <div>
                        <Label text="Asset Owner" />
                        <Input
                          placeholder="Optional"
                          value={assetOwner}
                          onChange={(e) => setAssetOwner(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <Label text="Tracking Device*" />
                  {vehicleMode === "adhoc" && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600">
                      Override Mapping
                    </span>
                  )}
                </div>

                <div>
                  <Label text="Primary Tracking Unit*" required />
                  <SearchableDropdown
                    options={deviceOptions}
                    value={selectedPrimaryDeviceOption}
                    onChange={(option) =>
                      setPrimaryDevice(String(option?.value || ""))
                    }
                    placeholder="Select Device..."
                    isDark={false}
                    isClearable={false}
                    isDisabled={
                      vehicleMode === "master" && !!selectedVehicleData
                    }
                  />
                  {vehicleMode === "master" && selectedVehicleData && (
                    <p className="text-[9px] font-bold text-emerald-600 mt-2 uppercase tracking-wider">
                      Auto-assigned from fleet mapping
                    </p>
                  )}
                  {vehicleMode === "adhoc" && (
                    <p className="text-[11px] italic text-slate-500 mt-2">
                      Manual device assignment required for external assets.
                    </p>
                  )}
                </div>

                <div>
                  <Label text="Secondary Device (Optional)" />
                  <SearchableDropdown
                    options={deviceOptions}
                    value={selectedSecondaryDeviceOption}
                    onChange={(option) =>
                      setSecondaryDevice(String(option?.value || ""))
                    }
                    placeholder="Select Secondary Device..."
                    isDark={false}
                    isClearable={false}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Routing & Schedule */}
          <section className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <SectionHeader number={3} title="Routing & Schedule" />

            <div className="space-y-8">
              {/* Routing & Frequency Selection */}
              <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
                      <div className="w-1 h-5 bg-indigo-600 rounded" />
                      Routing Model
                    </h4>
                    <div className="flex gap-2">
                      {(["standard", "dynamic"] as const).map((model) => (
                        <button
                          key={model}
                          onClick={() => setRoutingModel(model)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all",
                            routingModel === model
                              ? "bg-indigo-600 text-white shadow-lg"
                              : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300",
                          )}
                        >
                          {model === "standard" ? "Standard" : "Dynamic"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
                      <div className="w-1 h-5 bg-indigo-600 rounded" />
                      Frequency
                    </h4>
                    <div className="flex gap-2">
                      {(["recurring", "one-time"] as const).map((freq) => (
                        <button
                          key={freq}
                          onClick={() => setFrequency(freq)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all",
                            frequency === freq
                              ? "bg-orange-500 text-white shadow-lg"
                              : "bg-white border border-slate-200 text-slate-600 hover:border-orange-300",
                          )}
                        >
                          {freq === "recurring" ? "Recurring" : "One-Time"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Day Selection or Date Input */}
                {frequency === "recurring" ? (
                  <div className="pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-4">
                      Select Running Days
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {WEEK_DAYS.map((day) => {
                        const isSelected = selectedDays.includes(day);
                        return (
                          <button
                            key={day}
                            onClick={() => toggleDay(day)}
                            className={cn(
                              "px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all",
                              isSelected
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300",
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                      <div className="w-px h-8 bg-slate-200" />
                      <button
                        onClick={toggleAllDays}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all",
                          selectedDays.length === 7
                            ? "bg-slate-900 text-white shadow-lg"
                            : "bg-white border border-slate-200 text-slate-600 hover:border-slate-900",
                        )}
                      >
                        {selectedDays.length === 7 ? "Daily" : "Run Daily"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-6 border-t border-slate-200">
                    <Label text="Trip Start Date" required />
                    <Input
                      type="date"
                      value={oneTimeDate}
                      onChange={(e) => setOneTimeDate(e.target.value)}
                    />
                  </div>
                )}

                {/* Route Selection */}
                {routingModel === "standard" && (
                  <div className="mt-6 flex gap-4 items-end">
                    <div className="flex-1">
                      <Label text="Select Pre-defined Route" />
                      <SearchableDropdown
                        options={routeMasterOptions}
                        value={selectedRouteOption}
                        onChange={(option) =>
                          setSelectedRoute(String(option?.value || ""))
                        }
                        placeholder="Choose from Route Master..."
                        isDark={false}
                        isClearable={false}
                      />
                    </div>
                    <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-2">
                      <Plus size={16} />
                      <span className="text-xs font-bold uppercase">
                        New Route
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Route Path / Stoppages */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-indigo-600 rounded" />
                  Route Path
                </h4>
                <div className="space-y-4">
                  {nodes.map((node, nodeIdx) => (
                    <div key={node.id} className="relative pl-20">
                      <div className="absolute left-9 top-0 bottom-0 w-px bg-slate-200" />
                      <div className="flex items-start gap-4 mb-4 border border-slate-200 rounded-2xl bg-slate-50/40 shadow-sm p-6">
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm",
                              node.type === "START"
                                ? "bg-emerald-500 text-white"
                                : node.type === "END"
                                  ? "bg-rose-500 text-white"
                                  : "bg-white text-slate-500 border border-slate-200",
                            )}
                          >
                            {node.type === "VIA" ? (
                              <MapPin size={20} />
                            ) : (
                              <Flag size={20} />
                            )}
                          </div>
                          {nodeIdx < nodes.length - 1 && (
                            <button
                              type="button"
                              onClick={() => addViaNode(nodeIdx)}
                              className="w-8 h-8 rounded-full border border-slate-300 bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                            >
                              <Plus size={14} className="mx-auto" />
                            </button>
                          )}
                          {nodeIdx < nodes.length - 1 && (
                            <div className="w-0.5 h-8 bg-gradient-to-b from-slate-300 to-slate-200" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p
                                className={cn(
                                  "inline-flex text-[10px] px-3 py-1 rounded-md font-black uppercase tracking-wider",
                                  node.type === "START"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : node.type === "END"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-slate-200 text-slate-700",
                                )}
                              >
                                {node.type === "START"
                                  ? "Starting Point"
                                  : node.type === "END"
                                    ? "Last Destination"
                                    : `Stoppage ${nodeIdx}`}
                              </p>
                              <p className="text-sm font-bold text-slate-900 mt-2">
                                {node.geofence || "Not Selected"}
                              </p>
                            </div>
                            {node.type === "VIA" && (
                              <button
                                onClick={() => removeNode(node.id)}
                                className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                                title="Remove stop"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                            <div>
                              <Label text="Location / Geofence" required />
                              {routingModel === "dynamic" ? (
                                <div className="relative">
                                  <Input
                                    placeholder="Search location..."
                                    value={node.geofence}
                                    onFocus={() => setShowAutocomplete(node.id)}
                                    onBlur={() => {
                                      setTimeout(() => {
                                        setShowAutocomplete((prev) =>
                                          prev === node.id ? null : prev,
                                        );
                                      }, 150);
                                    }}
                                    onKeyDown={(e) => {
                                      if (
                                        e.key === "Enter" &&
                                        (locationPredictions[node.id] || [])
                                          .length > 0
                                      ) {
                                        e.preventDefault();
                                        applyLocationToNode(
                                          node.id,
                                          locationPredictions[node.id][0],
                                        );
                                      }
                                    }}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      updateNode(node.id, {
                                        geofence: value,
                                        address: value,
                                        latitude: null,
                                        longitude: null,
                                      });
                                      setShowAutocomplete(node.id);
                                      fetchLocationPredictions(node.id, value);
                                    }}
                                  />
                                  <MapPin
                                    size={16}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                  />
                                  {showAutocomplete === node.id && (
                                    <div className="absolute z-30 mt-2 w-full max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                      {(locationPredictions[node.id] || [])
                                        .length > 0 ? (
                                        locationPredictions[node.id].map(
                                          (prediction) => (
                                            <button
                                              key={prediction.place_id}
                                              type="button"
                                              onClick={() =>
                                                applyLocationToNode(
                                                  node.id,
                                                  prediction,
                                                )
                                              }
                                              className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                                            >
                                              <p className="text-xs font-semibold text-slate-800">
                                                {
                                                  prediction
                                                    .structured_formatting
                                                    ?.main_text
                                                }
                                              </p>
                                              <p className="text-[11px] text-slate-500">
                                                {
                                                  prediction
                                                    .structured_formatting
                                                    ?.secondary_text
                                                }
                                              </p>
                                            </button>
                                          ),
                                        )
                                      ) : (
                                        <div className="px-3 py-2 text-xs text-slate-500">
                                          Type at least 3 characters
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <SearchableDropdown
                                  options={geofenceOptions}
                                  value={
                                    geofenceOptions.find(
                                      (opt) =>
                                        String(opt.label) ===
                                        String(node.geofence),
                                    ) || null
                                  }
                                  onChange={(option) =>
                                    updateNode(node.id, {
                                      geofence: String(option?.label || ""),
                                      address: String(option?.label || ""),
                                      latitude: null,
                                      longitude: null,
                                    })
                                  }
                                  placeholder="Select geofence..."
                                  isDark={false}
                                  isClearable={false}
                                  isDisabled={geofenceOptions.length === 0}
                                />
                              )}
                              {typeof node.latitude === "number" &&
                                typeof node.longitude === "number" && (
                                  <p className="mt-2 text-[11px] text-slate-500">
                                    Lat: {node.latitude.toFixed(6)} | Lng:{" "}
                                    {node.longitude.toFixed(6)}
                                  </p>
                                )}
                            </div>
                            <div>
                              <Label text="Planned Entry" required />
                              <Input
                                type={
                                  frequency === "one-time"
                                    ? "datetime-local"
                                    : "time"
                                }
                                value={node.plannedEntry}
                                onChange={(e) =>
                                  updateNode(node.id, {
                                    plannedEntry: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="md:max-w-[340px]">
                              <Label text="Planned Exit" required />
                              <Input
                                type={
                                  frequency === "one-time"
                                    ? "datetime-local"
                                    : "time"
                                }
                                value={node.plannedExit}
                                onChange={(e) =>
                                  updateNode(node.id, {
                                    plannedExit: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-3 gap-4">
                            <div className="flex items-end gap-2">
                              <Clock3
                                size={14}
                                className="text-slate-400 mb-1"
                              />
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Halt Time
                                </p>
                                <p className="text-xl font-black text-slate-800 leading-none">
                                  {node.haltTime}
                                  <span className="text-[11px] font-bold text-slate-500 ml-2">
                                    MINS
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-end gap-2">
                              <Navigation
                                size={14}
                                className="text-slate-400 mb-1"
                              />
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Distance From Prev
                                </p>
                                <p className="text-xl font-black text-slate-800 leading-none">
                                  {node.distanceFromPrev}
                                  <span className="text-[11px] font-bold text-slate-500 ml-2">
                                    KM
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-end gap-2">
                              <Zap size={14} className="text-slate-400 mb-1" />
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Transit Time
                                </p>
                                <p className="text-xl font-black text-slate-800 leading-none">
                                  {node.timeFromPrev}
                                  <span className="text-[11px] font-bold text-slate-500 ml-2">
                                    MINS
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Pickup & Delivery */}
          <section className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <SectionHeader number={4} title="Pickup & Delivery" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                <Label text="Consignor (Pickup Point)" required />
                <SearchableDropdown
                  options={partyOptions}
                  value={selectedConsignorOption}
                  onChange={(option) =>
                    setConsignor(String(option?.value || ""))
                  }
                  placeholder="Select Pickup Point..."
                  isDark={false}
                  isClearable={false}
                />
              </div>
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                <Label text="Consignee (Delivery Point)" required />
                <SearchableDropdown
                  options={partyOptions}
                  value={selectedConsigneeOption}
                  onChange={(option) =>
                    setConsignee(String(option?.value || ""))
                  }
                  placeholder="Select Delivery Point..."
                  isDark={false}
                  isClearable={false}
                />
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <button
            className={cn(
              "w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all shadow-lg inline-flex items-center justify-center gap-2",
              isFormValid
                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 hover:shadow-xl"
                : "bg-slate-100 text-slate-400 cursor-not-allowed",
            )}
            disabled={!isFormValid}
          >
            <Save size={18} />
            Plan & Dispatch Trip
          </button>
        </div>

        {/* Bottom Section: Full Width Dashboard */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Headers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 border-b border-slate-200">
            <div className="px-6 py-5 border-r border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Navigation size={16} className="text-indigo-600" />
                Trip Summary
              </h3>
            </div>
            <div className="px-6 py-5 border-r border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <MapIcon size={16} className="text-indigo-600" />
                Live Route Preview
              </h3>
            </div>
            <div className="px-6 py-5 bg-gradient-to-br from-slate-50 to-white">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <RouteIcon size={16} className="text-indigo-600" />
                Route Path
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3">
            {/* Trip Summary */}
            <div className="px-6 py-6 border-r border-slate-200 space-y-4">
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100">
                  <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">
                    Total Distance
                  </p>
                  <p className="text-3xl font-black text-indigo-900 mt-2">
                    {totalDistance}
                    <span className="text-sm ml-2">KM</span>
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider">
                    Est. Duration
                  </p>
                  <p className="text-3xl font-black text-amber-900 mt-2">
                    30<span className="text-sm ml-2">HRS</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">
                    Route Type
                  </span>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    {routingModel === "standard" ? "Standard" : "Dynamic"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">
                    Frequency
                  </span>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    {frequency === "recurring" ? "Recurring" : "One-Time"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">
                    Total Stops
                  </span>
                  <span className="text-xs font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                    {nodes.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Route Preview */}
            <div className="px-6 py-6 border-r border-slate-200">
              <div className="relative h-[320px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                {loadError ? (
                  <div className="h-full flex items-center justify-center bg-rose-50 text-rose-600 text-sm">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Maps failed to load
                  </div>
                ) : !isLoaded ? (
                  <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                    Loading map...
                  </div>
                ) : directionsResult ? (
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={DEFAULT_CENTER}
                    zoom={6}
                    onLoad={(map) => {
                      mapRef.current = map;
                    }}
                    options={{
                      mapTypeControl: false,
                      streetViewControl: false,
                      fullscreenControl: false,
                    }}
                  >
                    <DirectionsRenderer
                      directions={directionsResult}
                      options={{
                        suppressMarkers: false,
                        polylineOptions: {
                          strokeColor: "#4f46e5",
                          strokeWeight: 5,
                          strokeOpacity: 0.9,
                        },
                      }}
                    />
                  </GoogleMap>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                    {mapPreviewLoading
                      ? "Building route preview..."
                      : "Select start and end locations to preview route"}
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur px-3 py-2 rounded-lg border border-white shadow-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-black text-slate-800 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-indigo-600" />
                      {totalDistance} KM • 30 HRS
                    </div>
                    <button className="px-3 py-1 bg-indigo-600 text-white rounded text-[9px] font-black hover:bg-indigo-700 transition-colors whitespace-nowrap">
                      Optimize
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Route Path */}
            <div className="px-6 py-6 overflow-y-auto max-h-[400px]">
              <div className="space-y-3">
                {nodes.map((node, idx) => (
                  <div key={node.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full ring-2 flex-shrink-0",
                          node.type === "START"
                            ? "bg-emerald-500 ring-emerald-200"
                            : node.type === "END"
                              ? "bg-red-500 ring-red-200"
                              : "bg-blue-500 ring-blue-200",
                        )}
                      />
                      {idx < nodes.length - 1 && (
                        <div className="w-0.5 h-5 bg-slate-200 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-indigo-600 uppercase tracking-wider">
                        {node.type === "START"
                          ? "Origin"
                          : node.type === "END"
                            ? "Destination"
                            : `Stop ${idx}`}
                      </p>
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {node.geofence || "Not Selected"}
                      </p>
                      <p className="text-[8px] text-slate-500 mt-0.5 truncate">
                        {node.plannedEntry}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
