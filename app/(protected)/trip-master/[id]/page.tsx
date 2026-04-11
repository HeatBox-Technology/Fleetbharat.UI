"use client";

import {
  DirectionsRenderer,
  GoogleMap,
  Polyline,
} from "@react-google-maps/api";
import {
  AlertCircle,
  ArrowLeft,
  Flag,
  Map as MapIcon,
  MapPin,
  Navigation,
  Plus,
  Route as RouteIcon,
  Save,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import SearchableDropdown, {
  type SearchableOption,
} from "@/components/SearchableDropdown";
import { useGoogleMapsSdk } from "@/hooks/useGoogleMapsSdk";
import { getAccountHierarchy } from "@/services/accountService";
import {
  getAccountsDropdownByCategory,
  getCategoryDropdown,
  getDeviceDropdown,
  getDriverDropdown,
  getGeofenceDropdownByAccount,
  getTripTypeDropdown,
  getVehicleDropdown,
  getVehicleTypeDropdown,
} from "@/services/commonServie";
import { getGeofenceById } from "@/services/geofenceService";
import { getRouteMasterById } from "@/services/routeMasterService";
import {
  getRouteDropdown,
  getTripPlanById,
  upsertTripPlan,
} from "@/services/tripMasterService";
import {
  getStoredAccountId,
  getStoredUserId,
  persistSelectedAccountId,
} from "@/utils/storage";

type NodeType = "START" | "VIA" | "END";

interface RouteNode {
  id: string;
  type: NodeType;
  geofence: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  leadTime: number;
  eta: number;
}

interface AccountOption {
  id: number;
  value: string;
}

interface DriverMeta {
  name?: string;
  mobile?: string;
  phone?: string;
}

interface DriverOption extends SearchableOption {
  meta?: DriverMeta;
}

const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

const cn = (...classes: (string | undefined | boolean)[]) =>
  classes.filter(Boolean).join(" ");

const toServiceDropdownOptions = (response: unknown): SearchableOption[] => {
  let data: unknown[] = [];
  if (Array.isArray(response)) {
    data = response;
  } else if (response && typeof response === "object" && "data" in response) {
    const maybe = (response as { data?: unknown }).data;
    if (Array.isArray(maybe)) data = maybe;
  }

  return data
    .map((item) => {
      const record =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};

      return {
        value: String(record.id ?? record.accountId ?? record.value ?? ""),
        label: String(
          record.value ??
            record.name ??
            record.label ??
            record.vehicleTypeName ??
            record.accountName ??
            "",
        ),
      };
    })
    .filter((item: SearchableOption) => item.value && item.label);
};

const getEncodedPathFromDirections = (
  response: google.maps.DirectionsResult | null,
): string => {
  const route = response?.routes?.[0];
  const overviewPolyline = route?.overview_polyline;
  const fromOverview =
    typeof overviewPolyline === "string"
      ? overviewPolyline.trim()
      : String(
          (overviewPolyline as { points?: string } | undefined)?.points || "",
        ).trim();
  if (fromOverview) return fromOverview;

  const canEncode = Boolean(
    window?.google?.maps?.geometry?.encoding?.encodePath,
  );
  if (!canEncode) return "";

  const overviewPath = Array.isArray(route?.overview_path)
    ? route.overview_path
    : [];
  if (overviewPath.length > 1) {
    return window.google.maps.geometry.encoding.encodePath(overviewPath);
  }

  return "";
};

const decodePolylineToPath = (
  encodedPolyline: string,
): google.maps.LatLngLiteral[] => {
  if (!encodedPolyline?.trim()) return [];
  if (!window?.google?.maps?.geometry?.encoding?.decodePath) return [];
  const decoded =
    window.google.maps.geometry.encoding.decodePath(encodedPolyline);
  return decoded.map((p) => ({ lat: p.lat(), lng: p.lng() }));
};

const toApiTravelDate = (value: string): string => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  // UI input date: yyyy-MM-dd
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  // Already dd/MM/yyyy
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }

  return trimmed;
};

const fromApiTravelDate = (value: string): string => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  // API: yyyy-MM-ddTHH:mm:ss...
  const isoDateTimeMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoDateTimeMatch) {
    const [, year, month, day] = isoDateTimeMatch;
    return `${year}-${month}-${day}`;
  }

  // API: dd/MM/yyyy -> UI: yyyy-MM-dd
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Already yyyy-MM-dd
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;

  return "";
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
  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
    {text}
    {required && <span className="text-red-500">*</span>}
  </div>
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
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const { isLoaded, loadError } = useGoogleMapsSdk();
  const mapRef = useRef<google.maps.Map | null>(null);
  const geofenceLatLngCacheRef = useRef<Map<number, google.maps.LatLngLiteral>>(
    new Map(),
  );
  const planId = Number(params?.id || 0);

  // States - Shipment Details
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
  const [assignedDriverId, setAssignedDriverId] = useState<number>(0);
  const [assignedDriverName, setAssignedDriverName] = useState("");
  const [assignedDriverPhone, setAssignedDriverPhone] = useState("");
  const [tripType, setTripType] = useState("");
  const [tripTypeOptions, setTripTypeOptions] = useState<SearchableOption[]>(
    [],
  );

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
  const [etd, setEtd] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [routeMasterOptions, setRouteMasterOptions] = useState<
    SearchableOption[]
  >([]);
  const [predefinedRoutePath, setPredefinedRoutePath] = useState("");
  const [predefinedRoutePolyline, setPredefinedRoutePolyline] = useState<
    google.maps.LatLngLiteral[]
  >([]);

  // States - Asset Allocation
  const [vehicleMode, setVehicleMode] = useState<"master" | "adhoc">("master");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [adhocRegNo, setAdhocRegNo] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState("");
  const [vehicleCategoryOptions, setVehicleCategoryOptions] = useState<
    SearchableOption[]
  >([]);
  const [assetOwner, setAssetOwner] = useState("");
  const [primaryDevice, setPrimaryDevice] = useState("");
  const [secondaryDevice, setSecondaryDevice] = useState("");
  const [vehicleOptions, setVehicleOptions] = useState<SearchableOption[]>([]);
  const [deviceOptions, setDeviceOptions] = useState<SearchableOption[]>([]);
  const [driverOptions, setDriverOptions] = useState<DriverOption[]>([]);

  // States - Route Nodes
  const [nodes, setNodes] = useState<RouteNode[]>([
    {
      id: "1",
      type: "START",
      geofence: "Delhi Gateway Terminal",
      address: "Mahipalpur, New Delhi",
      latitude: null,
      longitude: null,
      leadTime: 0,
      eta: 0,
    },
    {
      id: "2",
      type: "END",
      geofence: "Pune Logistics Park",
      address: "Hinjewadi Phase 3, Pune",
      latitude: null,
      longitude: null,
      leadTime: 0,
      eta: 0,
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
  const [optimizeLoading, setOptimizeLoading] = useState(false);

  // States - Pickup & Delivery
  const [consignor, setConsignor] = useState("");
  const [consignee, setConsignee] = useState("");
  const [consignorOptions, setConsignorOptions] = useState<SearchableOption[]>(
    [],
  );
  const [consigneeOptions, setConsigneeOptions] = useState<SearchableOption[]>(
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

  // Computed Values
  const totalDistance = useMemo(
    () =>
      directionsResult?.routes?.[0]?.legs?.reduce((sum, leg) => {
        const distanceMeters = Number(leg?.distance?.value || 0);
        return sum + distanceMeters / 1000;
      }, 0) ?? 0,
    [directionsResult],
  );
  const selectedAccountOption =
    accountOptions.find(
      (opt) => Number(opt.value) === Number(selectedAccountId),
    ) || null;
  const selectedDriverOption =
    driverOptions.find((opt) => Number(opt.value) === assignedDriverId) || null;
  const selectedTripTypeOption =
    tripTypeOptions.find((opt) => String(opt.value) === tripType) || null;
  const selectedVehicleOption =
    vehicleOptions.find((opt) => String(opt.value) === selectedVehicle) || null;
  const selectedVehicleCategoryOption =
    vehicleCategoryOptions.find(
      (opt) => String(opt.value) === vehicleCategory,
    ) || null;
  const selectedPrimaryDeviceOption =
    deviceOptions.find((opt) => String(opt.value) === primaryDevice) || null;
  const selectedSecondaryDeviceOption =
    deviceOptions.find((opt) => String(opt.value) === secondaryDevice) || null;
  const selectedRouteOption =
    routeMasterOptions.find((opt) => String(opt.value) === selectedRoute) ||
    null;
  const selectedConsignorOption =
    consignorOptions.find((opt) => String(opt.value) === consignor) || null;
  const selectedConsigneeOption =
    consigneeOptions.find((opt) => String(opt.value) === consignee) || null;

  // Functions
  const addViaNode = (index: number) => {
    const newNode: RouteNode = {
      id: Math.random().toString(36).slice(2, 9),
      type: "VIA",
      geofence: "",
      address: "",
      latitude: null,
      longitude: null,
      leadTime: 0,
      eta: 0,
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

  const areNodesValid = nodes.every((node) => node.geofence);
  const routePathForSave = useMemo(() => {
    if (routingModel === "standard") return String(predefinedRoutePath || "");
    return getEncodedPathFromDirections(directionsResult);
  }, [directionsResult, predefinedRoutePath, routingModel]);
  const _isFormValid = !!(
    selectedAccountId > 0 &&
    assignedDriverId > 0 &&
    tripType &&
    etd &&
    consignor &&
    consignee &&
    (vehicleMode === "master" ? selectedVehicle : adhocRegNo) &&
    areNodesValid &&
    (frequency === "recurring" ? selectedDays.length > 0 : oneTimeDate)
  );

  const resolveGeofenceLatLng = useCallback(
    async (geoId: number): Promise<google.maps.LatLngLiteral | null> => {
      if (geoId <= 0) return null;
      const cached = geofenceLatLngCacheRef.current.get(geoId);
      if (cached) return cached;

      const res = await getGeofenceById(geoId);
      if (!res?.success) return null;
      const zone = res?.data?.zone || res?.data?.geofence || res?.data;
      const coordinates = Array.isArray(zone?.coordinates)
        ? zone.coordinates
        : [];
      const first = coordinates[0];
      const lat = Number(first?.latitude ?? 0);
      const lng = Number(first?.longitude ?? 0);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !lat || !lng) {
        return null;
      }

      const point = { lat, lng };
      geofenceLatLngCacheRef.current.set(geoId, point);
      return point;
    },
    [],
  );

  const buildRoutePointsForDirections = useCallback(async (): Promise<
    (string | google.maps.LatLngLiteral)[]
  > => {
    const routePoints: (string | google.maps.LatLngLiteral)[] = [];

    if (routingModel === "standard") {
      for (const node of nodes) {
        const rawGeoValue = String(node.geofence || "").trim();
        const numericGeoId = Number(rawGeoValue || 0);
        const geoId =
          Number.isFinite(numericGeoId) && numericGeoId > 0
            ? numericGeoId
            : Number(
                geofenceOptions.find(
                  (opt) =>
                    String(opt.label || "")
                      .trim()
                      .toLowerCase() ===
                    String(node.address || rawGeoValue || "")
                      .trim()
                      .toLowerCase(),
                )?.value || 0,
              );
        const point = await resolveGeofenceLatLng(geoId);
        if (point) {
          routePoints.push(point);
          continue;
        }

        const fallback = String(node.address || node.geofence || "").trim();
        if (fallback) routePoints.push(fallback);
      }
      return routePoints;
    }

    for (const node of nodes) {
      if (
        typeof node.latitude === "number" &&
        typeof node.longitude === "number"
      ) {
        routePoints.push({ lat: node.latitude, lng: node.longitude });
        continue;
      }
      const fallback = String(node.geofence || "").trim();
      if (fallback) routePoints.push(fallback);
    }

    return routePoints;
  }, [geofenceOptions, nodes, resolveGeofenceLatLng, routingModel]);

  const calculatePreviewRoute = useCallback(
    async ({ optimizeWaypoints = false } = {}) => {
      try {
        if (!isLoaded || !window?.google?.maps) return;
        if (routingModel === "standard" && Number(selectedRoute || 0) > 0)
          return;

        const routePoints = await buildRoutePointsForDirections();
        if (routePoints.length < 2) {
          setDirectionsResult(null);
          return;
        }

        setMapPreviewLoading(true);
        const directionsService = new window.google.maps.DirectionsService();
        const response = await directionsService.route({
          origin: routePoints[0],
          destination: routePoints[routePoints.length - 1],
          waypoints: routePoints.slice(1, -1).map((location) => ({
            location,
            stopover: true,
          })),
          optimizeWaypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
        });
        setDirectionsResult(response);
      } catch (error) {
        console.error("Map preview route error:", error);
        setDirectionsResult(null);
      } finally {
        setMapPreviewLoading(false);
      }
    },
    [buildRoutePointsForDirections, isLoaded, routingModel, selectedRoute],
  );

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [tripTypesRes, vehicleTypesRes] = await Promise.all([
          getTripTypeDropdown(),
          getVehicleTypeDropdown(),
        ]);

        const tripTypesRaw = Array.isArray(tripTypesRes?.data)
          ? tripTypesRes.data
          : [];
        setTripTypeOptions(
          tripTypesRaw
            .map((item: unknown) => {
              const record =
                item && typeof item === "object"
                  ? (item as Record<string, unknown>)
                  : {};
              const label = String(record?.value ?? "");
              return label ? { value: label, label } : null;
            })
            .filter(Boolean) as SearchableOption[],
        );

        const vehicleTypesRaw = Array.isArray(vehicleTypesRes?.data)
          ? vehicleTypesRes.data
          : [];
        setVehicleCategoryOptions(
          vehicleTypesRaw
            .map((item: unknown) => {
              const record =
                item && typeof item === "object"
                  ? (item as Record<string, unknown>)
                  : {};
              const label = String(
                record?.vehicleTypeName ?? record?.value ?? "",
              );
              return label ? { value: label, label } : null;
            })
            .filter(Boolean) as SearchableOption[],
        );
      } catch (error) {
        console.error("Error fetching trip/vehicle dropdowns:", error);
        setTripTypeOptions([]);
        setVehicleCategoryOptions([]);
      }
    };

    loadDropdowns();
  }, []);

  useEffect(() => {
    const loadParties = async () => {
      try {
        const categoriesRes = await getCategoryDropdown(20);
        const categories = Array.isArray(categoriesRes?.data)
          ? categoriesRes.data
          : [];

        const findCategoryId = (label: string) => {
          const target = String(label).trim().toLowerCase();
          const found = categories.find((item) => {
            const record =
              item && typeof item === "object"
                ? (item as Record<string, unknown>)
                : {};
            return (
              String(record?.value || "")
                .trim()
                .toLowerCase() === target
            );
          });
          const record =
            found && typeof found === "object"
              ? (found as Record<string, unknown>)
              : {};
          return Number(record?.id || 0);
        };

        const consigneeCategoryId = findCategoryId("consignee");
        const consignorCategoryId =
          findCategoryId("consigner") || findCategoryId("consignor");

        const [consigneeRes, consignorRes] = await Promise.all([
          consigneeCategoryId > 0
            ? getAccountsDropdownByCategory(consigneeCategoryId)
            : Promise.resolve({ data: [] }),
          consignorCategoryId > 0
            ? getAccountsDropdownByCategory(consignorCategoryId)
            : Promise.resolve({ data: [] }),
        ]);

        setConsigneeOptions(toServiceDropdownOptions(consigneeRes));
        setConsignorOptions(toServiceDropdownOptions(consignorRes));
      } catch (error) {
        console.error("Error fetching consignor/consignee dropdowns:", error);
        setConsignorOptions([]);
        setConsigneeOptions([]);
      }
    };

    loadParties();
  }, []);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await getAccountHierarchy();
        const accountRows = Array.isArray(response?.data) ? response.data : [];
        const mapped = accountRows.map((item) => {
          const record =
            item && typeof item === "object"
              ? (item as Record<string, unknown>)
              : {};

          return {
            id: Number(record.id ?? 0),
            value: String(record.value ?? record.name ?? record.id ?? ""),
          };
        });
        setAccounts(mapped);

        const storedId = getStoredAccountId();
        if (storedId > 0) {
          setSelectedAccountId(storedId);
          persistSelectedAccountId(storedId);
        } else if (mapped.length > 0) {
          setSelectedAccountId(Number(mapped[0].id));
          persistSelectedAccountId(Number(mapped[0].id));
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };

    fetchAccounts();
  }, []);

  useEffect(() => {
    const accountId = Number(selectedAccountId || 0);
    if (accountId <= 0) {
      setRouteMasterOptions([]);
      setGeofenceOptions([]);
      setDriverOptions([]);
      setVehicleOptions([]);
      setDeviceOptions([]);
      return;
    }

    const fetchDropdowns = async () => {
      try {
        const [driversRes, vehiclesRes, devicesRes, routeRes, geofenceRes] =
          await Promise.all([
            getDriverDropdown(accountId),
            getVehicleDropdown(accountId),
            getDeviceDropdown(accountId),
            getRouteDropdown(accountId),
            getGeofenceDropdownByAccount(accountId),
          ]);

        const driverData = Array.isArray(driversRes?.data)
          ? driversRes.data
          : Array.isArray(driversRes)
            ? driversRes
            : [];
        setDriverOptions(
          driverData
            .map((d) => {
              const record =
                d && typeof d === "object"
                  ? (d as Record<string, unknown>)
                  : {};

              return {
                value: Number(record.driverId ?? record.id ?? 0),
                label: String(record.name ?? record.value ?? ""),
                meta: {
                  name: String(record.name ?? ""),
                  mobile: String(record.mobile ?? ""),
                  phone: String(record.phone ?? ""),
                },
              } satisfies DriverOption;
            })
            .filter((opt) => Number(opt.value) > 0 && opt.label),
        );

        setVehicleOptions(toServiceDropdownOptions(vehiclesRes));
        setDeviceOptions(toServiceDropdownOptions(devicesRes));
        setRouteMasterOptions(toServiceDropdownOptions(routeRes));
        setGeofenceOptions(toServiceDropdownOptions(geofenceRes));
      } catch (error) {
        console.error("Error fetching dropdowns:", error);
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
    if (!isLoaded) return;
    if (nodes.length < 2) return;
    if (routingModel === "standard" && Number(selectedRoute || 0) > 0) return;

    calculatePreviewRoute();
  }, [
    calculatePreviewRoute,
    isLoaded,
    nodes.length,
    routingModel,
    selectedRoute,
  ]);

  useEffect(() => {
    if (!mapRef.current || !directionsResult?.routes?.[0]?.bounds) return;
    mapRef.current.fitBounds(directionsResult.routes[0].bounds);
  }, [directionsResult]);

  useEffect(() => {
    if (!mapRef.current || predefinedRoutePolyline.length < 2) return;
    const bounds = new window.google.maps.LatLngBounds();
    for (const point of predefinedRoutePolyline) {
      bounds.extend(point);
    }
    mapRef.current.fitBounds(bounds);
  }, [predefinedRoutePolyline]);

  useEffect(() => {
    const resolvedRouteId = Number(selectedRoute || 0);
    if (routingModel !== "standard") return;

    if (resolvedRouteId <= 0) {
      setPredefinedRoutePath("");
      setPredefinedRoutePolyline([]);
      setDirectionsResult(null);
      return;
    }

    const loadRoute = async () => {
      try {
        const res = await getRouteMasterById(resolvedRouteId);
        const data = res?.data;
        if (!data) return;

        const encodedPath = String(data?.routePath || "").trim();
        setPredefinedRoutePath(encodedPath);
        setPredefinedRoutePolyline(decodePolylineToPath(encodedPath));
        setDirectionsResult(null);

        const resolveLabel = (geoId: number) =>
          String(
            geofenceOptions.find((opt) => Number(opt.value) === geoId)?.label ||
              "",
          );

        const startGeoId = Number(data?.startGeoId || 0);
        const endGeoId = Number(data?.endGeoId || 0);
        const stopIds = Array.isArray(data?.stopGeofenceIds)
          ? data.stopGeofenceIds.map((id: unknown) => Number(id || 0))
          : [];

        const pathIds = [startGeoId, ...stopIds, endGeoId].filter(
          (id) => id > 0,
        );
        if (pathIds.length < 2) return;

        setNodes(
          pathIds.map((id, index) => ({
            id: `${id}-${index}`,
            type:
              index === 0
                ? "START"
                : index === pathIds.length - 1
                  ? "END"
                  : "VIA",
            geofence: String(id),
            address: resolveLabel(id),
            latitude: null,
            longitude: null,
            leadTime: 0,
            eta: 0,
          })),
        );
      } catch (error) {
        console.error("Error loading predefined route:", error);
        setPredefinedRoutePath("");
        setPredefinedRoutePolyline([]);
      }
    };

    loadRoute();
  }, [geofenceOptions, routingModel, selectedRoute]);

  useEffect(() => {
    const resolvedPlanId = Number(planId || 0);
    if (!resolvedPlanId) return;

    const load = async () => {
      try {
        const res = await getTripPlanById(resolvedPlanId, selectedAccountId);
        const data = res?.data;
        if (!data) return;

        setSelectedAccountId(Number(data?.accountId || selectedAccountId || 0));
        setAssignedDriverId(Number(data?.driverId || 0));
        setAssignedDriverName(String(data?.driverName || ""));
        setAssignedDriverPhone(String(data?.driverPhone || ""));
        setConsignor(String(data?.consignor || ""));
        setConsignee(String(data?.consignee || ""));
        setTripType(
          String(data?.routingModel || "").toUpperCase() === "DYNAMIC"
            ? "Dynamic"
            : "Fix",
        );
        setVehicleMode(
          String(data?.fleetSource || "").toUpperCase() === "EXTERNAL"
            ? "adhoc"
            : "master",
        );
        setSelectedVehicle(String(data?.vehicleId || ""));
        setAdhocRegNo(String(data?.vehicleNumber || data?.vehicleNo || ""));
        setVehicleCategory(String(data?.vehicleCategory || ""));
        setPrimaryDevice(String(data?.primaryDevice || ""));
        setSecondaryDevice(String(data?.secondaryDevice || ""));

        const frequencyRaw = String(data?.frequency || "").toUpperCase();
        const resolvedFrequency =
          frequencyRaw === "RECURRING"
            ? "recurring"
            : frequencyRaw === "ONE-TIME"
              ? "one-time"
              : String(data?.weekDays || "").trim()
                ? "recurring"
                : data?.travelDate
                  ? "one-time"
                  : "recurring";

        setFrequency(resolvedFrequency);
        setOneTimeDate(fromApiTravelDate(String(data?.travelDate || "")));
        setEtd(String(data?.etd || ""));
        setRoutingModel(
          String(data?.routingModel || "").toUpperCase() === "DYNAMIC"
            ? "dynamic"
            : "standard",
        );
        setSelectedRoute(String(data?.routeId || ""));
        setPredefinedRoutePath(String(data?.routePath || ""));
        setPredefinedRoutePolyline(
          decodePolylineToPath(String(data?.routePath || "")),
        );

        const details = Array.isArray(data?.routeDetails)
          ? data.routeDetails
          : [];
        if (details.length > 0) {
          const mapped: RouteNode[] = [];

          details.forEach((detail: unknown, index: number) => {
            const record =
              detail && typeof detail === "object"
                ? (detail as Record<string, unknown>)
                : {};

            if (index === 0) {
              mapped.push({
                id: "1",
                type: "START",
                geofence: String(record?.fromGeoId || ""),
                address: String(record?.fromGeoName || ""),
                latitude:
                  record?.fromLatitude !== null &&
                  record?.fromLatitude !== undefined
                    ? Number(record?.fromLatitude)
                    : null,
                longitude:
                  record?.fromLongitude !== null &&
                  record?.fromLongitude !== undefined
                    ? Number(record?.fromLongitude)
                    : null,
                leadTime: 0,
                eta: 0,
              });
            }

            mapped.push({
              id: Math.random().toString(36).slice(2, 9),
              type: index === details.length - 1 ? "END" : "VIA",
              geofence: String(record?.toGeoId || ""),
              address: String(record?.toGeoName || ""),
              latitude:
                record?.toLatitude !== null && record?.toLatitude !== undefined
                  ? Number(record?.toLatitude)
                  : null,
              longitude:
                record?.toLongitude !== null &&
                record?.toLongitude !== undefined
                  ? Number(record?.toLongitude)
                  : null,
              leadTime: Number(record?.leadTime || 0),
              eta: Number(record?.rta || 0),
            });
          });

          setNodes((prev) => (mapped.length >= 2 ? mapped : prev));
        }
      } catch (error) {
        console.error("Error loading trip plan:", error);
      }
    };

    load();
  }, [planId, selectedAccountId]);

  const buildRouteDetailsPayload = () => {
    if (nodes.length < 2) return [];

    return nodes.slice(0, -1).map((fromNode, index) => {
      const toNode = nodes[index + 1];

      const fromGeoId =
        routingModel === "standard" ? Number(fromNode.geofence || 0) : 0;
      const toGeoId =
        routingModel === "standard" ? Number(toNode.geofence || 0) : 0;

      return {
        fromGeoId,
        fromGeoName:
          routingModel === "dynamic"
            ? String(fromNode.address || fromNode.geofence || "")
            : null,
        fromLatitude:
          routingModel === "dynamic" && typeof fromNode.latitude === "number"
            ? String(fromNode.latitude)
            : null,
        fromLongitude:
          routingModel === "dynamic" && typeof fromNode.longitude === "number"
            ? String(fromNode.longitude)
            : null,
        toGeoId,
        toGeoName:
          routingModel === "dynamic"
            ? String(toNode.address || toNode.geofence || "")
            : null,
        toLatitude:
          routingModel === "dynamic" && typeof toNode.latitude === "number"
            ? String(toNode.latitude)
            : null,
        toLongitude:
          routingModel === "dynamic" && typeof toNode.longitude === "number"
            ? String(toNode.longitude)
            : null,
        sequence: index + 1,
        distance: "0",
        leadTime: Number(toNode.leadTime || 0),
        rta: Number(toNode.eta || 0),
      };
    });
  };

  const handleSave = async () => {
    const missing: string[] = [];
    if (!(selectedAccountId > 0)) missing.push("Account");
    if (!(assignedDriverId > 0)) missing.push("Driver");
    if (!String(tripType || "").trim()) missing.push("Trip Type");
    if (!String(etd || "").trim()) missing.push("ETD");
    if (!String(consignor || "").trim()) missing.push("Consignor");
    if (!String(consignee || "").trim()) missing.push("Consignee");

    if (vehicleMode === "master") {
      if (!String(selectedVehicle || "").trim()) missing.push("Vehicle");
    } else {
      if (!String(adhocRegNo || "").trim()) missing.push("Vehicle Number");
      if (!String(vehicleCategory || "").trim())
        missing.push("Vehicle Category");
    }

    if (frequency === "recurring") {
      if (selectedDays.length === 0) missing.push("Week Days");
    } else {
      if (!String(oneTimeDate || "").trim()) missing.push("Travel Date");
    }

    const normalizedTripType = String(tripType || "").toLowerCase();
    const isElockTrip =
      normalizedTripType.includes("e-lock") ||
      normalizedTripType.includes("elock") ||
      normalizedTripType.includes("lock");
    const isGPSTrip = normalizedTripType.includes("gps");
    if (isElockTrip && !String(primaryDevice || "").trim()) {
      missing.push("Primary Device");
    }

    if (!areNodesValid) missing.push("Route Geofences/Locations");
    if (!String(routePathForSave || "").trim()) missing.push("Route Path");

    if (missing.length > 0) {
      toast.error(`Missing: ${missing.join(", ")}`);
      return;
    }

    const fleetSource = vehicleMode === "master" ? "INTERNAL" : "EXTERNAL";

    const routeDetails = buildRouteDetailsPayload();

    const startGeoId =
      routingModel === "standard" ? Number(nodes?.[0]?.geofence || 0) : 0;
    const endGeoId =
      routingModel === "standard"
        ? Number(nodes?.[nodes.length - 1]?.geofence || 0)
        : 0;

    const payload = {
      planId,
      accountId: selectedAccountId,
      driverId: assignedDriverId,
      driverName: assignedDriverName,
      driverPhone: assignedDriverPhone,
      fleetSource,
      vehicleId: vehicleMode === "master" ? Number(selectedVehicle || 0) : 0,
      vehicleNumber:
        vehicleMode === "master"
          ? String(selectedVehicleOption?.label || "")
          : String(adhocRegNo || ""),
      frequency: frequency === "one-time" ? "ONE-TIME" : "RECURRING",
      travelDate: frequency === "one-time" ? toApiTravelDate(oneTimeDate) : "",
      etd,
      routingModel: routingModel === "standard" ? "STANDARD" : "DYNAMIC",
      routeId: routingModel === "standard" ? Number(selectedRoute || 0) : 0,
      routePath: routePathForSave,
      startGeoId,
      endGeoId,
      createdBy: getStoredUserId(),
      weekDays: frequency === "recurring" ? selectedDays.join(",") : "",
      isElockTrip,
      isGPSTrip,
      primaryDevice: isElockTrip ? primaryDevice : "",
      secondaryDevice,
      vehicleCategory: vehicleMode === "adhoc" ? vehicleCategory : "",
      consignee: Number(consignee || 0),
      consignor: Number(consignor || 0),
      routeDetails,
    };

    try {
      const res = await upsertTripPlan(payload);
      if (res?.success === false) {
        console.error("Trip plan save failed:", res);
        return;
      }
      router.push("/trip-master");
    } catch (error) {
      console.error("Error saving trip plan:", error);
    }
  };

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
              type="button"
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
                  onChange={(option) => {
                    const id = Number(option?.value || 0);
                    setSelectedAccountId(id);
                    persistSelectedAccountId(id);
                  }}
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
                  onChange={(option) => {
                    const selected = option as DriverOption | null;
                    const id = Number(selected?.value || 0);
                    setAssignedDriverId(id);
                    const meta = selected?.meta || {};
                    setAssignedDriverName(
                      String(meta?.name || selected?.label || ""),
                    );
                    setAssignedDriverPhone(
                      String(meta?.mobile || meta?.phone || ""),
                    );
                  }}
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
                        options={vehicleOptions}
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
                      <Label text="Vehicle Number" />
                      <Input
                        value={String(selectedVehicleOption?.label || "")}
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
                  />
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
                          type="button"
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
                          type="button"
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
                            type="button"
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
                        type="button"
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

                <div className="mt-6">
                  <Label text="ETD" required />
                  <Input
                    type="time"
                    value={etd}
                    onChange={(e) => setEtd(e.target.value)}
                  />
                </div>

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
                    <button
                      type="button"
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-2"
                    >
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
                    <div key={node.id} className="relative mb-4 pl-20">
                      <div className="absolute left-7 top-16 bottom-0 w-px bg-slate-200" />
                      <div className="absolute left-0 top-6 flex flex-col items-center gap-2">
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
                      <div className="border border-slate-200 rounded-2xl bg-slate-50/40 shadow-sm p-6">
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
                                type="button"
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
                                        String(opt.value) ===
                                        String(node.geofence),
                                    ) || null
                                  }
                                  onChange={(option) =>
                                    updateNode(node.id, {
                                      geofence: String(option?.value || ""),
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
                          </div>

                          <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label text="Lead Time (mins)" />
                              <Input
                                type="number"
                                min={0}
                                value={String(node.leadTime ?? 0)}
                                onChange={(e) =>
                                  updateNode(node.id, {
                                    leadTime: Number(e.target.value || 0),
                                  })
                                }
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <Label text="ETA (mins)" />
                              <Input
                                type="number"
                                min={0}
                                value={String(node.eta ?? 0)}
                                onChange={(e) =>
                                  updateNode(node.id, {
                                    eta: Number(e.target.value || 0),
                                  })
                                }
                                placeholder="0"
                              />
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
                  options={consignorOptions}
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
                  options={consigneeOptions}
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
            type="button"
            className={cn(
              "w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all shadow-lg inline-flex items-center justify-center gap-2",
              "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 hover:shadow-xl",
            )}
            onClick={handleSave}
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
                    {directionsResult ? (
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
                    ) : predefinedRoutePolyline.length > 1 ? (
                      <Polyline
                        path={predefinedRoutePolyline}
                        options={{
                          strokeColor: "#4f46e5",
                          strokeWeight: 5,
                          strokeOpacity: 0.9,
                        }}
                      />
                    ) : null}
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
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (
                            routingModel === "standard" &&
                            Number(selectedRoute || 0) > 0
                          ) {
                            toast.info(
                              "Pre-defined route selected. Route preview is already available.",
                            );
                            return;
                          }
                          setOptimizeLoading(true);
                          await calculatePreviewRoute({
                            optimizeWaypoints: true,
                          });
                        } finally {
                          setOptimizeLoading(false);
                        }
                      }}
                      className="px-3 py-1 bg-indigo-600 text-white rounded text-[9px] font-black hover:bg-indigo-700 transition-colors whitespace-nowrap"
                    >
                      {optimizeLoading ? "Optimizing..." : "Optimize"}
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
                        {node.address || node.geofence || "Not Selected"}
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
