"use client";

import { DirectionsRenderer, GoogleMap } from "@react-google-maps/api";
import {
  ArrowLeft,
  Flag,
  Plus,
  Route,
  Save,
  Sparkles,
  Trash2,
  MapPin,
  Navigation,
  Clock,
  Gauge,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import SearchableDropdown, {
  type SearchableOption,
} from "@/components/SearchableDropdown";
import { useTheme } from "@/context/ThemeContext";
import { useGoogleMapsSdk } from "@/hooks/useGoogleMapsSdk";
import type {
  DropdownOption,
  RouteMasterFormData,
} from "@/interfaces/routeMaster.interface";
import { getAccountHierarchy } from "@/services/accountService";
import {
  getFormRightForPath,
  getGeofenceDropdownByAccount,
} from "@/services/commonServie";
import { getGeofenceById } from "@/services/geofenceService";
import {
  getRouteMasterById,
  saveRouteMaster,
  updateRouteMaster,
} from "@/services/routeMasterService";

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

interface SegmentSummary {
  from: string;
  to: string;
  startAddress: string;
  endAddress: string;
  distanceKm: number;
  travelTimeMin: number;
}

interface GeofenceLatLng {
  lat: number;
  lng: number;
}

const toKm = (distanceMetres: number | string): number =>
  Number(distanceMetres || 0) / 1000;

const toMinutes = (durationSeconds: number | string): number =>
  Number(durationSeconds || 0) / 60;

const getEncodedPathFromDirections = (
  response: google.maps.DirectionsResult,
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

  const legs = Array.isArray(route?.legs) ? route.legs : [];
  const stepPath = legs.flatMap((leg) =>
    Array.isArray(leg?.steps)
      ? leg.steps.flatMap((step) =>
          Array.isArray(step?.path) ? step.path : [],
        )
      : [],
  );
  if (stepPath.length > 1) {
    return window.google.maps.geometry.encoding.encodePath(stepPath);
  }

  return "";
};

const toOptions = (response: any): DropdownOption[] => {
  const data = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : [];

  return data.map((item: any) => ({
    id: Number(item?.id ?? item?.value ?? 0),
    value: String(item?.value ?? item?.name ?? item?.label ?? item?.id ?? ""),
  }));
};

const getUserData = () => {
  if (typeof window === "undefined") return { accountId: 0, userId: 0 };
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      accountId: Number(user?.accountId || 0),
      userId: Number(user?.id || user?.userId || 0),
    };
  } catch {
    return { accountId: 0, userId: 0 };
  }
};

const AddEditRouteMasterPage: React.FC = () => {
  const { isDark } = useTheme();
  const { isLoaded, loadError } = useGoogleMapsSdk();
  const router = useRouter();
  const t = useTranslations("pages.routeMaster.detail");
  const params = useParams();
  const routeId = params?.id ? Number(params.id) : 0;
  const isEditMode = routeId > 0;
  const pageRight = getFormRightForPath("/route-master");
  const canRead = pageRight ? Boolean(pageRight.canRead) : true;
  const canSaveAction = pageRight
    ? isEditMode
      ? Boolean(pageRight.canUpdate)
      : Boolean(pageRight.canWrite)
    : true;

  const mapRef = useRef<google.maps.Map | null>(null);

  const [accounts, setAccounts] = useState<DropdownOption[]>([]);
  const [geofences, setGeofences] = useState<DropdownOption[]>([]);
  const [formData, setFormData] = useState<RouteMasterFormData>({
    accountId: 0,
    routeName: "",
    isGeofenceRelated: true,
    startGeofenceId: 0,
    endGeofenceId: 0,
    stopGeofenceIds: [],
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isGoogleMapOptimized, setIsGoogleMapOptimized] = useState(false);
  const [directionsResult, setDirectionsResult] =
    useState<google.maps.DirectionsResult | null>(null);
  const [segmentSummaries, setSegmentSummaries] = useState<SegmentSummary[]>(
    [],
  );
  const [storedStopDetails, setStoredStopDetails] = useState<
    { fromGeoId: number; toGeoId: number; distance: string; time: string }[]
  >([]);

  const [routeMetrics, setRouteMetrics] = useState<{
    routePath: string;
    totalDistance: string;
    totalTime: string;
    segmentMetrics: { distanceMetres: number; durationSeconds: number }[];
    waypointKey: string;
  } | null>(null);

  const [savedEncodedPath, setSavedEncodedPath] = useState<string>("");

  const accountDropdownOptions = useMemo<SearchableOption[]>(
    () =>
      accounts.map((acc) => ({
        value: Number(acc.id),
        label: acc.value,
      })),
    [accounts],
  );

  const geofenceDropdownOptions = useMemo<SearchableOption[]>(
    () =>
      geofences.map((zone) => ({
        value: Number(zone.id),
        label: zone.value,
      })),
    [geofences],
  );

  // Original functions from your code - keeping all logic intact
  const fetchGeofenceDropdown = async (accountId: number) => {
    const res = await getGeofenceDropdownByAccount(accountId);
    return toOptions(res);
  };

  const fetchAccounts = async () => {
    try {
      const response = await getAccountHierarchy();
      const accountOptions = Array.isArray(response?.data) ? response.data : [];
      setAccounts(
        accountOptions.map((item: any) => ({
          id: Number(item?.id || 0),
          value: String(item?.value || item?.name || item?.id || ""),
        })),
      );
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchById = useCallback(async () => {
    try {
      setFetchingData(true);
      const response = await getRouteMasterById(routeId);
      const data =
        response?.data?.route || response?.data?.routeMaster || response?.data;

      if (!data) {
        toast.error(t("toast.notFound"));
        router.push("/route-master");
        return;
      }

      const parsedStops = Array.isArray(data?.stopGeofenceIds)
        ? data.stopGeofenceIds.map((value: any) => Number(value || 0))
        : Array.isArray(data?.stops)
          ? data.stops
          : [];

      setFormData({
        accountId: Number(data?.accountId || 0),
        routeName: String(data?.routeName || ""),
        isGeofenceRelated: Boolean(
          data?.isGeofenceRelated ?? data?.isRoute ?? true,
        ),
        startGeofenceId: Number(data?.startGeofenceId || 0),
        endGeofenceId: Number(data?.endGeofenceId || 0),
        stopGeofenceIds: parsedStops,
        isActive: Boolean(data?.isActive ?? true),
      });
      setIsGoogleMapOptimized(
        Boolean(data?.isGoogleMapOptimized ?? String(data?.routePath || "").trim()),
      );

      const accountId = Number(data?.accountId || getUserData().accountId || 0);
      const updatedGeofences = await fetchGeofenceDropdown(accountId);
      setGeofences(updatedGeofences);

      if (data?.routePath) {
        setSavedEncodedPath(String(data.routePath || ""));
        setRouteMetrics({
          routePath: String(data.routePath || ""),
          totalDistance: String(data?.totalDistance || "0"),
          totalTime: String(data?.totalTime || "0"),
          segmentMetrics: Array.isArray(data?.stopDetails)
            ? data.stopDetails.map((seg: any) => ({
                distanceMetres: Number(seg?.distance || 0),
                durationSeconds: Number(seg?.time || 0),
              }))
            : [],
          waypointKey: [
            Number(data?.startGeofenceId || 0),
            ...parsedStops.filter((id: number) => id > 0),
            Number(data?.endGeofenceId || 0),
          ]
            .filter((id) => id > 0)
            .join("->"),
        });
      }
    } catch (error) {
      console.error("Error fetching route:", error);
      toast.error(t("toast.fetchError"));
    } finally {
      setFetchingData(false);
    }
  }, [routeId, t, router]);

  const resolveGeofenceLatLng = useCallback(
    async (geofenceId: number): Promise<GeofenceLatLng | null> => {
      const response = await getGeofenceById(geofenceId);
      const zone =
        response?.data?.zone || response?.data?.geofence || response?.data;
      const coordinates = Array.isArray(zone?.coordinates)
        ? zone.coordinates
        : [];

      if (coordinates.length === 0) return null;

      const geometryType = String(zone?.geometryType || "").toUpperCase();
      if (geometryType === "POLYGON" && coordinates.length > 1) {
        const lat =
          coordinates.reduce(
            (sum: number, point: any) => sum + Number(point?.latitude || 0),
            0,
          ) / coordinates.length;
        const lng =
          coordinates.reduce(
            (sum: number, point: any) => sum + Number(point?.longitude || 0),
            0,
          ) / coordinates.length;
        return { lat, lng };
      }

      return {
        lat: Number(coordinates[0]?.latitude || 0),
        lng: Number(coordinates[0]?.longitude || 0),
      };
    },
    [],
  );

  const calculateRoute = async () => {
    try {
      if (!isLoaded || !window?.google) {
        toast.error("Google Maps not loaded yet");
        return;
      }
      if (!formData.startGeofenceId || !formData.endGeofenceId) {
        toast.error(t("toast.selectStartEndGeofence"));
        return;
      }
      if (formData.startGeofenceId === formData.endGeofenceId) {
        toast.error(t("toast.startEndMustDiffer"));
        return;
      }
      if (formData.stopGeofenceIds.some((id) => Number(id || 0) <= 0)) {
        toast.error(t("toast.selectGeofenceForEachStop"));
        return;
      }

      setPreviewLoading(true);

      const waypointIds = [
        Number(formData.startGeofenceId || 0),
        ...formData.stopGeofenceIds.map((id) => Number(id || 0)).filter((id) => id > 0),
        Number(formData.endGeofenceId || 0),
      ].filter((id) => id > 0);

      const points = await Promise.all(
        waypointIds.map(async (id) => ({
          id,
          point: await resolveGeofenceLatLng(id),
        })),
      );
      const invalidPoint = points.find((item) => !item.point);
      if (invalidPoint) {
        toast.error(t("toast.resolveGeofenceFailed", { id: invalidPoint.id }));
        setIsGoogleMapOptimized(false);
        return;
      }

      const geofenceNameById = new Map(
        geofences.map((item) => [Number(item.id), item.value]),
      );

      const routePoints = points.map(
        (item) => item.point as google.maps.LatLngLiteral,
      );
      const directionsService = new window.google.maps.DirectionsService();
      const response = await directionsService.route({
        origin: routePoints[0],
        destination: routePoints[routePoints.length - 1],
        waypoints: routePoints.slice(1, -1).map((point) => ({
          location: point,
          stopover: true,
        })),
        optimizeWaypoints: false,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      const legs = response.routes?.[0]?.legs || [];
      const summaries = legs.map((leg, index) => ({
        from:
          geofenceNameById.get(waypointIds[index]) ||
          t("fields.geofenceFallback", { id: waypointIds[index] }),
        to:
          geofenceNameById.get(waypointIds[index + 1]) ||
          t("fields.geofenceFallback", { id: waypointIds[index + 1] }),
        startAddress: leg.start_address || "-",
        endAddress: leg.end_address || "-",
        distanceKm: toKm(leg.distance?.value || 0),
        travelTimeMin: toMinutes(leg.duration?.value || 0),
      }));

      const overviewPolyline = getEncodedPathFromDirections(response);
      if (!overviewPolyline) {
        toast.error(t("toast.encodedPathUnavailable"));
        setIsGoogleMapOptimized(false);
        return;
      }

      const totalDistanceMetres = legs.reduce(
        (sum, leg) => sum + (leg.distance?.value || 0),
        0,
      );
      const totalDurationSeconds = legs.reduce(
        (sum, leg) => sum + (leg.duration?.value || 0),
        0,
      );

      setDirectionsResult(response);
      setSegmentSummaries(summaries);
      setStoredStopDetails([]);
      setRouteMetrics({
        routePath: overviewPolyline,
        totalDistance: String(totalDistanceMetres),
        totalTime: String(totalDurationSeconds),
        segmentMetrics: legs.map((leg) => ({
          distanceMetres: leg.distance?.value || 0,
          durationSeconds: leg.duration?.value || 0,
        })),
        waypointKey: waypointIds.join("->"),
      });
      setIsGoogleMapOptimized(true);
    } catch (error) {
      console.error("Directions error:", error);
      toast.error(t("toast.previewFailed"));
      setDirectionsResult(null);
      setSegmentSummaries([]);
      setStoredStopDetails([]);
      setRouteMetrics(null);
      setIsGoogleMapOptimized(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveRoute = async () => {
    if (!canSaveAction) {
      toast.error(
        isEditMode ? t("toast.noUpdatePermission") : t("toast.noAddPermission"),
      );
      return;
    }

    if (!formData.accountId) {
      toast.error(t("toast.selectAccount"));
      return;
    }
    if (!formData.routeName.trim()) {
      toast.error(t("toast.enterRouteName"));
      return;
    }
    if (!formData.startGeofenceId || !formData.endGeofenceId) {
      toast.error(t("toast.selectStartEndGeofence"));
      return;
    }
    if (!routeMetrics?.routePath) {
      toast.error(t("toast.routePathMissing"));
      return;
    }

    try {
      setLoading(true);
      const { userId } = getUserData();
      const payload = {
        accountId: Number(formData.accountId),
        routeName: formData.routeName.trim(),
        isGeofenceRelated: Boolean(formData.isGeofenceRelated),
        startGeofenceId: Number(formData.startGeofenceId),
        endGeofenceId: Number(formData.endGeofenceId),
        stopGeofenceIds: formData.stopGeofenceIds
          .map((id) => Number(id || 0))
          .filter((id) => id > 0),
        isActive: Boolean(formData.isActive),
        isGoogleMapOptimized: Boolean(isGoogleMapOptimized),
        routePath: routeMetrics.routePath,
        totalDistance: routeMetrics.totalDistance,
        totalTime: routeMetrics.totalTime,
        segmentMetrics: routeMetrics.segmentMetrics,
        ...(isEditMode
          ? { updatedBy: Number(userId || 0) }
          : { createdBy: Number(userId || 0) }),
      };

      const response = isEditMode
        ? await updateRouteMaster(routeId, payload)
        : await saveRouteMaster(payload);

      if (response?.success || response?.statusCode === 200) {
        toast.success(
          response?.message ||
            (isEditMode ? t("toast.updated") : t("toast.created")),
        );
        router.push("/route-master");
      } else {
        toast.error(response?.message || t("toast.saveFailed"));
      }
    } catch (error) {
      console.error("Save route error:", error);
      toast.error(t("toast.saveError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    if (isEditMode) {
      fetchById();
    } else {
      const { accountId } = getUserData();
      if (accountId > 0) {
        setFormData((prev) => ({ ...prev, accountId: prev.accountId || accountId }));
      }
    }
  }, [isEditMode, fetchById]);

  useEffect(() => {
    const accountId = Number(formData.accountId || 0);
    if (accountId <= 0) {
      setGeofences([]);
      return;
    }
    fetchGeofenceDropdown(accountId)
      .then((options) => setGeofences(options))
      .catch((error) => console.error("Error fetching geofences:", error));
  }, [formData.accountId]);

  useEffect(() => {
    if (!isLoaded || !savedEncodedPath || !window?.google?.maps?.geometry) return;
    const decodedPath =
      window.google.maps.geometry.encoding.decodePath(savedEncodedPath);
    if (decodedPath.length < 2) return;
    const bounds = decodedPath.reduce(
      (b: google.maps.LatLngBounds, point) => b.extend(point),
      new window.google.maps.LatLngBounds(),
    );
    const syntheticResult = {
      routes: [
        {
          overview_polyline: { points: savedEncodedPath },
          overview_path: decodedPath,
          bounds,
          legs: [],
          waypoint_order: [],
          warnings: [],
          copyrights: "",
          summary: "",
          fare: undefined,
        },
      ],
      geocoded_waypoints: [],
      available_travel_modes: [],
      request: {},
    } as unknown as google.maps.DirectionsResult;
    setDirectionsResult(syntheticResult);
  }, [isLoaded, savedEncodedPath]);

  useEffect(() => {
    if (!mapRef.current || !directionsResult?.routes?.[0]?.bounds) return;
    mapRef.current.fitBounds(directionsResult.routes[0].bounds);
  }, [directionsResult]);

  const bgClass = isDark
    ? "min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    : "min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50";

  const headerBgClass = isDark
    ? "border-slate-800 bg-slate-950/30"
    : "border-slate-200 bg-white/30";

  const cardBgClass = isDark ? "bg-slate-900/90" : "bg-white/90";
  const textDarkClass = isDark ? "text-slate-200" : "text-slate-800";
  const textLightClass = isDark ? "text-slate-400" : "text-slate-500";
  const bgDarkClass = isDark ? "bg-slate-800" : "bg-slate-100";
  const selectedAccountOption =
    accountDropdownOptions.find(
      (opt) => Number(opt.value) === Number(formData.accountId),
    ) || null;
  const selectedStartOption =
    geofenceDropdownOptions.find(
      (opt) => Number(opt.value) === Number(formData.startGeofenceId),
    ) || null;
  const selectedEndOption =
    geofenceDropdownOptions.find(
      (opt) => Number(opt.value) === Number(formData.endGeofenceId),
    ) || null;
  const canShowSaveButton = isEditMode || Boolean(routeMetrics?.routePath);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Sora:wght@400;600&display=swap');
        
        * {
          font-family: 'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .card-premium {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.6) 100%);
          border: 1px solid rgba(148, 163, 184, 0.15);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card-premium.light {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%);
          border-color: rgba(148, 163, 184, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .card-premium:hover {
          border-color: rgba(6, 182, 212, 0.3);
          box-shadow: 0 12px 48px rgba(6, 182, 212, 0.15);
          transform: translateY(-2px);
        }

        .form-input {
          background: rgba(30, 41, 59, 0.5);
          border: 2px solid rgba(71, 85, 105, 0.3);
          color: #e2e8f0;
          transition: all 0.2s ease;
          border-radius: 14px;
          padding: 12px 16px;
          font-size: 14px;
          width: 100%;
        }

        .form-input.light {
          background: rgba(248, 250, 252, 0.8);
          border-color: rgba(226, 232, 240, 0.8);
          color: #1e293b;
        }

        .form-input:focus {
          outline: none;
          border-color: #06b6d4;
          background: rgba(30, 41, 59, 0.8);
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
        }

        .form-input.light:focus {
          background: rgba(240, 249, 255, 0.9);
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
          position: relative;
          overflow: hidden;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(6, 182, 212, 0.4);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.5px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-subtitle {
          font-size: 13px;
          margin-top: 8px;
        }

        .metric-card {
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
          border: 1px solid rgba(6, 182, 212, 0.2);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
        }

        .metric-card:hover {
          border-color: rgba(6, 182, 212, 0.4);
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
        }

        .metric-icon {
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          color: white;
          border-radius: 10px;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .animate-in {
          animation: slideInUp 0.4s ease-out;
        }

        .form-group {
          animation: slideInUp 0.4s ease-out backwards;
        }

        .form-group:nth-child(1) { animation-delay: 0.05s; }
        .form-group:nth-child(2) { animation-delay: 0.1s; }
        .form-group:nth-child(3) { animation-delay: 0.15s; }
        .form-group:nth-child(4) { animation-delay: 0.2s; }
      `}</style>

      <div className={bgClass}>
        {/* Decorative background elements */}
        <div
          className={`fixed inset-0 pointer-events-none overflow-hidden ${
            isDark ? "opacity-30" : "opacity-20"
          }`}
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div
            className={`border-b sticky top-0 z-50 backdrop-blur-md ${headerBgClass}`}
          >
            <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/route-master")}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold font-['Poppins'] bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent">
                    {isEditMode ? "Edit Route" : "Create New Route"}
                  </h1>
                  <p className={`text-sm ${textLightClass}`}>
                    {isEditMode
                      ? "Update an existing route"
                      : "Add a new delivery route"}
                  </p>
                </div>
              </div>

              {formData.isActive && (
                <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Active
                </span>
              )}
            </div>
          </div>

          <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
            {fetchingData ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                {/* Main Form Section */}
                <section className="xl:col-span-2 space-y-6">
                  {/* Route Information Card */}
                  <div
                    className={`card-premium ${!isDark ? "light" : ""} p-8 animate-in`}
                  >
                    <div
                      className={`section-title ${isDark ? "text-slate-100" : "text-slate-800"}`}
                    >
                      <Route className="w-5 h-5 text-cyan-500" />
                      Route Information
                    </div>

                    <div className="space-y-5">
                      <div className="form-group">
                        <label
                          className={`block text-sm font-semibold mb-2 ${
                            isDark ? "text-slate-200" : "text-slate-700"
                          }`}
                        >
                          Account
                        </label>
                        <SearchableDropdown
                          options={accountDropdownOptions}
                          value={selectedAccountOption}
                          onChange={(option) => {
                            const nextAccountId = Number(option?.value || 0);
                            setIsGoogleMapOptimized(false);
                            setRouteMetrics(null);
                            setDirectionsResult(null);
                            setSegmentSummaries([]);
                            setFormData((prev) => ({
                              ...prev,
                              accountId: nextAccountId,
                              startGeofenceId: 0,
                              endGeofenceId: 0,
                              stopGeofenceIds: [],
                            }));
                          }}
                          placeholder="Select Account"
                          isDisabled={loading}
                          isDark={isDark}
                          isClearable={false}
                        />
                      </div>

                      <div className="form-group">
                        <label
                          className={`block text-sm font-semibold mb-2 ${
                            isDark ? "text-slate-200" : "text-slate-700"
                          }`}
                        >
                          Route Name
                        </label>
                        <input
                          type="text"
                          value={formData.routeName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              routeName: e.target.value,
                            })
                          }
                          placeholder="e.g., Delhi - Gurugram Route"
                          className={`form-input ${!isDark ? "light" : ""}`}
                        />
                        <p
                          className={`section-subtitle ${isDark ? "text-slate-400" : "text-slate-500"}`}
                        >
                          Give your route a descriptive name
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Geofence Selection Card */}
                  <div
                    className={`card-premium ${!isDark ? "light" : ""} p-8 animate-in`}
                  >
                    <div
                      className={`section-title ${isDark ? "text-slate-100" : "text-slate-800"}`}
                    >
                      <MapPin className="w-5 h-5 text-cyan-500" />
                      Route Points
                    </div>

                    <div className="space-y-5">
                      <div className="form-group">
                        <label
                          className={`block text-sm font-semibold mb-2 ${
                            isDark ? "text-slate-200" : "text-slate-700"
                          }`}
                        >
                          Start Location
                        </label>
                        <SearchableDropdown
                          options={geofenceDropdownOptions}
                          value={selectedStartOption}
                          onChange={(option) => {
                            setIsGoogleMapOptimized(false);
                            setFormData((prev) => ({
                              ...prev,
                              startGeofenceId: Number(option?.value || 0),
                            }));
                          }}
                          placeholder="Search starting point..."
                          isDisabled={loading}
                          isDark={isDark}
                          isClearable={false}
                        />
                      </div>

                      <div className="form-group">
                        <label
                          className={`block text-sm font-semibold mb-2 ${
                            isDark ? "text-slate-200" : "text-slate-700"
                          }`}
                        >
                          End Location
                        </label>
                        <SearchableDropdown
                          options={geofenceDropdownOptions}
                          value={selectedEndOption}
                          onChange={(option) => {
                            setIsGoogleMapOptimized(false);
                            setFormData((prev) => ({
                              ...prev,
                              endGeofenceId: Number(option?.value || 0),
                            }));
                          }}
                          placeholder="Search destination..."
                          isDisabled={loading}
                          isDark={isDark}
                          isClearable={false}
                        />
                      </div>

                      {/* Stop Points */}
                      <div className="form-group">
                        <div className="flex items-center justify-between mb-2">
                          <label
                            className={`block text-sm font-semibold ${
                              isDark ? "text-slate-200" : "text-slate-700"
                            }`}
                          >
                            Stop Points ({formData.stopGeofenceIds.length})
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsGoogleMapOptimized(false);
                              setFormData({
                                ...formData,
                                stopGeofenceIds: [
                                  ...formData.stopGeofenceIds,
                                  0,
                                ],
                              });
                            }}
                            className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 text-sm font-semibold transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Add Stop
                          </button>
                        </div>

                        <div className="space-y-3 mt-4">
                          {formData.stopGeofenceIds.map((stopId, index) => (
                            <div
                              key={`stop-${index}`}
                              className="flex gap-3 items-start"
                            >
                              <div className="flex-1">
                                <SearchableDropdown
                                  options={geofenceDropdownOptions}
                                  value={
                                    geofenceDropdownOptions.find(
                                      (opt) => Number(opt.value) === Number(stopId),
                                    ) || null
                                  }
                                  onChange={(option) => {
                                    setIsGoogleMapOptimized(false);
                                    const newStops = [...formData.stopGeofenceIds];
                                    newStops[index] = Number(option?.value || 0);
                                    setFormData({
                                      ...formData,
                                      stopGeofenceIds: newStops,
                                    });
                                  }}
                                  placeholder={`Stop ${index + 1}...`}
                                  isDisabled={loading}
                                  isDark={isDark}
                                  isClearable={false}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsGoogleMapOptimized(false);
                                  const newStops =
                                    formData.stopGeofenceIds.filter(
                                      (_, i) => i !== index,
                                    );
                                  setFormData({
                                    ...formData,
                                    stopGeofenceIds: newStops,
                                  });
                                }}
                                className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Route Configuration Card */}
                  <div
                    className={`card-premium ${!isDark ? "light" : ""} p-8 animate-in`}
                  >
                    <div
                      className={`section-title ${isDark ? "text-slate-100" : "text-slate-800"}`}
                    >
                      <Navigation className="w-5 h-5 text-cyan-500" />
                      Configuration
                    </div>

                    <div className="space-y-4">
                      <label
                        className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                          isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.isGeofenceRelated}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isGeofenceRelated: e.target.checked,
                            })
                          }
                          className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 cursor-pointer accent-cyan-500"
                        />
                        <span
                          className={`text-sm font-semibold ${
                            isDark ? "text-slate-200" : "text-slate-700"
                          }`}
                        >
                          Route Type: Geofence Related
                        </span>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                          isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isActive: e.target.checked,
                            })
                          }
                          className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 cursor-pointer accent-cyan-500"
                        />
                        <span
                          className={`text-sm font-semibold ${
                            isDark ? "text-slate-200" : "text-slate-700"
                          }`}
                        >
                          {formData.isActive ? "Active" : "Inactive"}
                        </span>
                      </label>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={calculateRoute}
                          disabled={
                            previewLoading ||
                            !isLoaded ||
                            formData.startGeofenceId <= 0 ||
                            formData.endGeofenceId <= 0
                          }
                          className="w-full btn-primary inline-flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          {previewLoading ? "Optimizing..." : "Optimize Route"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => router.push("/route-master")}
                      className={`flex-1 px-6 py-3 rounded-lg border-2 font-semibold transition-colors ${
                        isDark
                          ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Cancel
                    </button>
                    {canShowSaveButton && (
                      <button
                        type="button"
                        onClick={saveRoute}
                        disabled={loading || !canSaveAction}
                        className="flex-1 btn-primary inline-flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {loading
                          ? "Saving..."
                          : isEditMode
                            ? "Update Route"
                            : "Create Route"}
                      </button>
                    )}
                  </div>
                </section>

                {/* Route Preview Sidebar */}
                <aside className="xl:col-span-3 xl:sticky xl:top-32 h-fit">
                  <div
                    className={`card-premium ${!isDark ? "light" : ""} p-6 animate-in`}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3
                        className={`text-lg font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}
                      >
                        <Navigation className="w-5 h-5 text-cyan-500" />
                        Route Preview
                      </h3>
                    </div>

                    {/* Map */}
                    <div
                      className={`relative rounded-2xl overflow-hidden border-2 h-96 mb-6 shadow-lg ${
                        isDark ? "border-slate-700" : "border-slate-200"
                      }`}
                    >
                      {loadError ? (
                        <div
                          className={`h-full flex items-center justify-center text-sm ${
                            isDark
                              ? "bg-rose-950/30 text-rose-400"
                              : "bg-rose-50 text-rose-500"
                          }`}
                        >
                          <AlertCircle className="w-5 h-5 mr-2" />
                          {t("section.mapsLoadFailed")}
                        </div>
                      ) : !isLoaded ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500 mx-auto mb-3"></div>
                            <p className={`text-sm ${textLightClass}`}>
                              {t("section.loadingMap")}
                            </p>
                          </div>
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
                                strokeColor: "#06b6d4",
                                strokeWeight: 5,
                                strokeOpacity: 0.9,
                              },
                            }}
                          />
                        </GoogleMap>
                      ) : (
                        <div
                          className={`h-full flex flex-col items-center justify-center ${
                            isDark
                              ? "bg-gradient-to-br from-slate-800 to-slate-900"
                              : "bg-gradient-to-br from-slate-50 to-slate-100"
                          }`}
                        >
                          <div className="text-center">
                            <Route
                              className={`w-10 h-10 mx-auto mb-3 opacity-50 ${isDark ? "text-slate-400" : "text-slate-400"}`}
                            />
                            <p
                              className={`text-sm font-medium ${textLightClass}`}
                            >
                              {previewLoading
                                ? t("buttons.loadingRoute")
                                : "Click 'Optimize Route' to see preview"}
                            </p>
                          </div>
                        </div>
                      )}

                      {routeMetrics && (
                        <div
                          className={`card-premium ${!isDark ? "light" : ""} absolute right-4 bottom-4 p-4 shadow-xl`}
                        >
                          <p className="text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-1">
                            Total Distance
                          </p>
                          <p
                            className={`text-3xl font-black leading-none ${isDark ? "text-white" : "text-slate-900"}`}
                          >
                            {toKm(routeMetrics.totalDistance || 0).toFixed(2)}
                          </p>
                          <p
                            className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}
                          >
                            KM
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Metrics */}
                    {routeMetrics && (
                      <div className="space-y-3">
                        <div className="metric-card">
                          <div className="metric-icon">
                            <Gauge className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className={`text-xs ${textLightClass}`}>
                              Distance
                            </p>
                            <p
                              className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
                            >
                              {toKm(routeMetrics.totalDistance || 0).toFixed(2)}{" "}
                              km
                            </p>
                          </div>
                        </div>
                        <div className="metric-card">
                          <div className="metric-icon">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className={`text-xs ${textLightClass}`}>
                              Travel Time
                            </p>
                            <p
                              className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
                            >
                              {toMinutes(routeMetrics.totalTime || 0).toFixed(
                                0,
                              )}{" "}
                              min
                            </p>
                          </div>
                        </div>
                        {isGoogleMapOptimized && (
                          <div className="metric-card border-emerald-200 dark:border-emerald-800">
                            <div
                              className="metric-icon"
                              style={{
                                background:
                                  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                Google Optimized
                              </p>
                              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                Route is optimized
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Segments Table */}
                    {segmentSummaries.length > 0 && (
                      <div
                        className={`mt-6 border-t pt-6 ${isDark ? "border-slate-700" : "border-slate-200"}`}
                      >
                        <h4
                          className={`text-sm font-bold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}
                        >
                          Route Segments
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {segmentSummaries.map((segment, index) => (
                            <div
                              key={`segment-${index}`}
                              className={`p-3 rounded-lg transition-colors ${
                                isDark
                                  ? "bg-slate-800/50 hover:bg-slate-800"
                                  : "bg-slate-50 hover:bg-slate-100"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <p
                                  className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}
                                >
                                  {segment.from} → {segment.to}
                                </p>
                              </div>
                              <div
                                className={`flex gap-4 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                              >
                                <span>{segment.distanceKm.toFixed(2)} km</span>
                                <span>
                                  {segment.travelTimeMin.toFixed(0)} min
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AddEditRouteMasterPage;
