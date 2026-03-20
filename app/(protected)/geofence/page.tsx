"use client";

import { Building2, ChevronDown, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import CommonTable from "@/components/CommonTable";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { useTheme } from "@/context/ThemeContext";
import type { GeofenceZone, ZoneStatus } from "@/interfaces/geofence.interface";
import { getAllAccounts, getFormRightForPath } from "@/services/commonServie";
import {
  deleteGeofence,
  exportGeofences,
  getGeofenceById,
  getGeofences,
} from "@/services/geofenceService";
import { getVehicleGeofences } from "@/services/vehicleGeofenceService";
import {
  clearGeofenceSyncStatus,
  deleteGeofenceFromJava,
  getGeofenceSyncStatusMap,
  GEOFENCE_JAVA_SYNC_STATUS,
  syncGeofenceToJava,
} from "@/services/geofenceJavaSyncService";

type ApiZone = {
  id?: string | number;
  geoId?: string | number;
  accountId?: string | number;
  orgId?: string | number;
  orgName?: string;
  accountName?: string;
  uniqueCode?: string;
  displayName?: string;
  geoName?: string;
  vehicleNo?: string;
  classificationCode?: string;
  geometryType?: string;
  status?: string;
  colorTheme?: string;
  radiusM?: number;
  createdAt?: string;
  updatedAt?: string | null;
  coordinates?: { latitude: number; longitude: number }[];
};

type AccountOption = {
  id: number;
  value: string;
};

type MapPoint = {
  lat: number;
  lng: number;
};

const formatStandardDate = (value?: string) => {
  if (!value || String(value).startsWith("0001-01-01")) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getAccountIdFromStorage = () => {
  if (typeof window === "undefined") return 0;

  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) return 0;
    const user = JSON.parse(userRaw);
    return Number(user?.accountId || 0);
  } catch {
    return 0;
  }
};

const normalizeZoneSource = (source: any) => {
  const geometryRaw = String(
    source?.geometryType ?? source?.geoType ?? source?.geometry ?? "CIRCLE",
  ).toUpperCase();
  const geometry = geometryRaw === "POLYGON" ? "polygon" : "circle";
  const coordinates = Array.isArray(source?.coordinates)
    ? source.coordinates
    : Array.isArray(source?.geoPoints)
      ? source.geoPoints
      : [];
  const firstCoordinate = coordinates[0];

  return {
    geometry,
    radius:
      geometry === "circle"
        ? Number(source?.radiusM ?? source?.radius ?? 0)
        : undefined,
    center:
      geometry === "circle" && firstCoordinate
        ? {
            lat: Number(firstCoordinate?.latitude ?? firstCoordinate?.lat ?? 0),
            lng: Number(
              firstCoordinate?.longitude ?? firstCoordinate?.lng ?? 0,
            ),
          }
        : undefined,
    paths:
      geometry === "polygon"
        ? coordinates.map((coord: any) => ({
            lat: Number(coord?.latitude ?? coord?.lat ?? 0),
            lng: Number(coord?.longitude ?? coord?.lng ?? 0),
          }))
        : undefined,
  };
};

export default function GeofencePage() {
  const { isDark } = useTheme();
  const router = useRouter();
  const t = useTranslations("pages.geofence.list");
  const tDetail = useTranslations("pages.geofence.detail");
  const pageRight = getFormRightForPath("/geofence");
  const canRead = pageRight ? Boolean(pageRight.canRead) : true;

  const [zones, setZones] = useState<GeofenceZone[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loadingZones, setLoadingZones] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [syncingRowId, setSyncingRowId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const autoSyncStartedRef = useRef<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<GeofenceZone | null>(null);
  const [summary, setSummary] = useState({
    totalZones: 0,
    enabled: 0,
    disabled: 0,
  });

  const mapApiZoneToUi = useCallback(
    (zone: ApiZone, index: number): GeofenceZone => {
      const geometry = zone?.geometryType === "POLYGON" ? "polygon" : "circle";
      const status: ZoneStatus =
        zone?.status === "ENABLED" ? "enabled" : "disabled";
      const firstCoordinate =
        Array.isArray(zone?.coordinates) && zone.coordinates.length > 0
          ? zone.coordinates[0]
          : undefined;
      const syncEntry =
        getGeofenceSyncStatusMap()[
          String(zone?.id ?? zone?.geoId ?? `zone-${index}`)
        ] || null;
      const accountId = Number(
        zone?.accountId ??
          zone?.orgId ??
          selectedAccountId ??
          getAccountIdFromStorage() ??
          0,
      );
      const orgName =
        String(zone?.orgName ?? zone?.accountName ?? "") ||
        accounts.find((account) => account.id === accountId)?.value ||
        "";

      return {
        id: String(zone?.id ?? zone?.geoId ?? `zone-${index}`),
        code: String(zone?.uniqueCode ?? `GF-${index + 1}`),
        displayName: String(
          zone?.displayName ?? zone?.geoName ?? t("fallback.unnamedZone"),
        ),
        classification: String(zone?.classificationCode ?? t("fallback.safe")),
        geometry,
        status,
        color: zone?.colorTheme || "#6366f1",
        accountId,
        orgName,
        vehicleNo: String(zone?.vehicleNo ?? ""),
        createdAt: String(zone?.createdAt ?? ""),
        updatedAt: String(zone?.updatedAt ?? ""),
        javaSyncStatus:
          syncEntry?.status ?? GEOFENCE_JAVA_SYNC_STATUS.UNSYNCED,
        javaSyncMessage: syncEntry?.message ?? "",
        center:
          geometry === "circle" && firstCoordinate
            ? { lat: firstCoordinate.latitude, lng: firstCoordinate.longitude }
            : undefined,
        radius: geometry === "circle" ? Number(zone?.radiusM ?? 0) : undefined,
        paths:
          geometry === "polygon"
            ? zone?.coordinates?.map((coord) => ({
                lat: coord.latitude,
                lng: coord.longitude,
              }))
            : undefined,
      };
    },
    [accounts, selectedAccountId, t],
  );

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await getAllAccounts();
      if (response?.statusCode === 200 && Array.isArray(response?.data)) {
        setAccounts(response.data);
      }
    } catch (error) {
      console.error("Error fetching geofence accounts:", error);
    }
  }, []);

  const fetchGeofenceList = useCallback(async () => {
    if (!selectedAccountId || selectedAccountId <= 0) {
      setZones([]);
      setTotalRecords(0);
      setSummary({
        totalZones: 0,
        enabled: 0,
        disabled: 0,
      });
      setLoadingZones(false);
      setIsInitialLoad(false);
      return;
    }

    try {
      if (isInitialLoad) setLoadingZones(true);
      const response = await getGeofences(
        pageNo,
        pageSize,
        debouncedQuery,
        selectedAccountId,
      );
      if (!response?.success) {
        toast.error(response?.message || t("toast.fetchFailed"));
        return;
      }

      const zonesData = response?.data?.zones;
      const rawList = zonesData?.items || [];

      setTotalRecords(zonesData?.totalRecords || rawList.length);
      setSummary({
        totalZones: Number(
          response?.data?.summary?.totalZones || rawList.length,
        ),
        enabled: Number(response?.data?.summary?.enabled || 0),
        disabled: Number(response?.data?.summary?.disabled || 0),
      });

      setZones(
        Array.isArray(rawList)
          ? rawList.map((item: ApiZone, index: number) =>
              mapApiZoneToUi(item, index),
            )
          : [],
      );

      void getVehicleGeofences({
        page: 1,
        pageSize: 5000,
        accountId: selectedAccountId || undefined,
      })
        .then((vehicleGeofenceResponse) => {
          const assignmentItems = Array.isArray(
            vehicleGeofenceResponse?.data?.assignments?.items,
          )
            ? vehicleGeofenceResponse.data.assignments.items
            : [];
          const vehicleNoByGeofenceId = new Map<string, string>();

          assignmentItems.forEach((item: any) => {
            const geofenceId = String(item?.geofenceId || "");
            const vehicleNo = String(item?.vehicleNo || "").trim();
            if (
              geofenceId &&
              vehicleNo &&
              !vehicleNoByGeofenceId.has(geofenceId)
            ) {
              vehicleNoByGeofenceId.set(geofenceId, vehicleNo);
            }
          });

          setZones((prevZones) =>
            prevZones.map((zone) => ({
              ...zone,
              vehicleNo:
                zone.vehicleNo ||
                vehicleNoByGeofenceId.get(String(zone.id)) ||
                "",
            })),
          );
        })
        .catch(() => null);
    } catch (error) {
      console.error("Error fetching geofences:", error);
    } finally {
      setLoadingZones(false);
      setIsInitialLoad(false);
    }
  }, [
    pageNo,
    pageSize,
    debouncedQuery,
    isInitialLoad,
    mapApiZoneToUi,
    selectedAccountId,
    t,
  ]);

  useEffect(() => {
    const userAccountId = getAccountIdFromStorage();
    setSelectedAccountId(userAccountId > 0 ? userAccountId : 0);
    void fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (!selectedAccountId || selectedAccountId <= 0) return;
    fetchGeofenceList();
  }, [fetchGeofenceList, selectedAccountId]);

  useEffect(() => {
    const nextZone = zones.find(
      (zone) =>
        zone.id &&
        zone.javaSyncStatus !== GEOFENCE_JAVA_SYNC_STATUS.SYNCED &&
        !autoSyncStartedRef.current.has(zone.id),
    );

    if (!nextZone || syncingAll || syncingRowId !== null) {
      return;
    }

    autoSyncStartedRef.current.add(nextZone.id);
    void handleSyncRow(nextZone, { silent: true });
  }, [zones, syncingAll, syncingRowId]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleEdit = (row: GeofenceZone) => {
    router.push(`/geofence/${row.id}?returnTo=${encodeURIComponent("/geofence")}`);
  };

  const handleDelete = (row: GeofenceZone) => {
    setZoneToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const response = await exportGeofences(selectedAccountId, debouncedQuery);
      if (response?.success || Number(response?.statusCode) === 200) {
        toast.success(t("toast.exportSuccess"));
      } else {
        toast.error(response?.message || t("toast.exportFailed"));
      }
    } catch {
      toast.error(t("toast.exportFailed"));
    }
  };

  const buildJavaSyncSource = useCallback(async (row: GeofenceZone) => {
    const hasCircleData =
      row.geometry === "circle" &&
      row.center &&
      Number(row.radius || 0) > 0 &&
      Number(row.center.lat || 0) !== 0 &&
      Number(row.center.lng || 0) !== 0;
    const hasPolygonData = row.geometry === "polygon" && (row.paths?.length || 0) > 0;

    if (hasCircleData || hasPolygonData) {
      return {
        geoId: row.id,
        displayName: row.displayName,
        accountId: row.accountId,
        orgName: row.orgName,
        geometry: row.geometry,
        radius: row.radius,
        center: row.center,
        paths: row.paths,
        coordinates:
          row.geometry === "circle" && row.center
            ? [{ latitude: row.center.lat, longitude: row.center.lng }]
            : row.paths?.map((point: MapPoint) => ({
                latitude: point.lat,
                longitude: point.lng,
              })),
        vehicleNo: row.vehicleNo,
      };
    }

    const response = await getGeofenceById(row.id);
    const zone =
      response?.data?.zone || response?.data?.geofence || response?.data || {};
    const normalized = normalizeZoneSource(zone);

    return {
      geoId: row.id,
      displayName: row.displayName || zone?.displayName || zone?.geoName || "",
      accountId: row.accountId || Number(zone?.accountId || zone?.orgId || 0),
      orgName: row.orgName || String(zone?.orgName ?? zone?.accountName ?? ""),
      geometry: normalized.geometry,
      radius: normalized.radius,
      center: normalized.center,
      paths: normalized.paths,
      coordinates:
        normalized.geometry === "circle" && normalized.center
          ? [
              {
                latitude: normalized.center.lat,
                longitude: normalized.center.lng,
              },
            ]
          : normalized.paths?.map((point: MapPoint) => ({
              latitude: point.lat,
              longitude: point.lng,
            })),
      vehicleNo: row.vehicleNo || String(zone?.vehicleNo || ""),
    };
  }, []);

  const applyZoneSyncStatus = (
    zoneId: string,
    status: string,
    message = "",
  ) => {
    setZones((prevZones) =>
      prevZones.map((zone) =>
        zone.id === zoneId
          ? {
              ...zone,
              javaSyncStatus: status,
              javaSyncMessage: message || zone.javaSyncMessage,
            }
          : zone,
      ),
    );
  };

  const refreshSyncStatuses = () => {
    const nextSyncStatusMap = getGeofenceSyncStatusMap();
    setZones((prevZones) =>
      prevZones.map((zone) => {
        const syncEntry = nextSyncStatusMap[String(zone.id)];
        return {
          ...zone,
          javaSyncStatus:
            syncEntry?.status ??
            zone.javaSyncStatus ??
            GEOFENCE_JAVA_SYNC_STATUS.UNSYNCED,
          javaSyncMessage: syncEntry?.message ?? zone.javaSyncMessage ?? "",
        };
      }),
    );
  };

  const handleSyncRow = async (
    row: GeofenceZone,
    options: { silent?: boolean } = {},
  ) => {
    const { silent = false } = options;
    try {
      setSyncingRowId(row.id);
      const syncSource = await buildJavaSyncSource(row);
      const result = await syncGeofenceToJava(syncSource);

      if (result.success) {
        applyZoneSyncStatus(
          row.id,
          GEOFENCE_JAVA_SYNC_STATUS.SYNCED,
          result?.data?.message || "Synced to Java",
        );
        refreshSyncStatuses();
        if (!silent) {
          toast.success(`Java sync completed for ${row.displayName}`);
        }
      } else {
        applyZoneSyncStatus(
          row.id,
          GEOFENCE_JAVA_SYNC_STATUS.FAILED,
          result?.data?.message || `Java sync failed for ${row.displayName}`,
        );
        refreshSyncStatuses();
        if (!silent) {
          toast.error(
            result?.data?.message || `Java sync failed for ${row.displayName}`,
          );
        }
      }
    } catch (error: any) {
      console.error("Error syncing geofence to Java:", error);
      refreshSyncStatuses();
      if (!silent) {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            `Java sync failed for ${row.displayName}`,
        );
      }
    } finally {
      setSyncingRowId(null);
    }
  };

  const handleSyncAllUnsynced = async () => {
    const rowsToSync = zones.filter(
      (zone) => zone.javaSyncStatus !== GEOFENCE_JAVA_SYNC_STATUS.SYNCED,
    );

    if (rowsToSync.length === 0) {
      toast.info("All visible rows are already synced to Java");
      return;
    }

    try {
      setSyncingAll(true);
      let successCount = 0;
      let failureCount = 0;

      for (const row of rowsToSync) {
        try {
          const syncSource = await buildJavaSyncSource(row);
          const result = await syncGeofenceToJava(syncSource);

          if (result.success) {
            applyZoneSyncStatus(
              row.id,
              GEOFENCE_JAVA_SYNC_STATUS.SYNCED,
              result?.data?.message || "Synced to Java",
            );
            successCount += 1;
          } else {
            applyZoneSyncStatus(
              row.id,
              GEOFENCE_JAVA_SYNC_STATUS.FAILED,
              result?.data?.message || `Java sync failed for ${row.displayName}`,
            );
            failureCount += 1;
          }
        } catch (error) {
          failureCount += 1;
          console.error(`Bulk Java sync failed for geofence ${row.id}:`, error);
        }
      }

      refreshSyncStatuses();
      if (failureCount === 0) {
        toast.success(`Java sync completed for ${successCount} row(s)`);
      } else {
        toast.warning(
          `Java sync finished with ${successCount} success and ${failureCount} failure`,
        );
      }
    } finally {
      setSyncingAll(false);
    }
  };

  const confirmDelete = async () => {
    if (!zoneToDelete) return;

    const deletingZone = zoneToDelete;

    try {
      const javaDeleteResult = await deleteGeofenceFromJava({
        geoId: deletingZone.id,
        displayName: deletingZone.displayName,
        accountId: deletingZone.accountId,
        orgName: deletingZone.orgName,
        geometry: deletingZone.geometry,
        radius: deletingZone.radius,
        center: deletingZone.center,
        paths: deletingZone.paths,
        coordinates:
          deletingZone.geometry === "circle" && deletingZone.center
            ? [
                {
                  latitude: deletingZone.center.lat,
                  longitude: deletingZone.center.lng,
                },
              ]
            : deletingZone.paths?.map((point: MapPoint) => ({
                latitude: point.lat,
                longitude: point.lng,
              })),
        vehicleNo: deletingZone.vehicleNo,
      });

      if (!javaDeleteResult.success) {
        toast.error(
          javaDeleteResult?.data?.message ||
            "Java delete failed. Local delete was not attempted.",
        );
        return;
      }

      clearGeofenceSyncStatus(deletingZone.id);
      setZoneToDelete(null);
      setIsDeleteDialogOpen(false);

      if (pageNo > 1 && zones.length === 1) {
        setPageNo((prev) => prev - 1);
      } else {
        setZones((prevZones) =>
          prevZones.filter((zone) => zone.id !== deletingZone.id),
        );
        setTotalRecords((prev) => Math.max(0, prev - 1));
        setSummary((prev) => ({
          totalZones: Math.max(0, prev.totalZones - 1),
          enabled:
            deletingZone.status === "enabled"
              ? Math.max(0, prev.enabled - 1)
              : prev.enabled,
          disabled:
            deletingZone.status === "disabled"
              ? Math.max(0, prev.disabled - 1)
              : prev.disabled,
        }));
      }

      toast.success(t("toast.deleted"));

      void deleteGeofence(deletingZone.id).then((response) => {
        if (
          !response?.success &&
          ![200, 202, 204].includes(Number(response?.statusCode || 0))
        ) {
          toast.warning(
            response?.message ||
              "Java delete succeeded, but local delete cleanup failed.",
          );
          void fetchGeofenceList();
          return;
        }

        if (response?.message) {
          toast.success(response.message);
        }
      });
    } catch (error) {
      console.error("Error deleting geofence:", error);
      toast.error(t("toast.deleteError"));
    } finally {
      setZoneToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    const handleBulkUploadCompleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ moduleKey?: string }>;
      if (customEvent.detail?.moduleKey !== "geofence") return;

      void (async () => {
        await fetchGeofenceList();
        setTimeout(() => {
          void handleSyncAllUnsynced();
        }, 1200);
      })();
    };

    window.addEventListener(
      "bulk-upload-completed",
      handleBulkUploadCompleted as EventListener,
    );

    return () => {
      window.removeEventListener(
        "bulk-upload-completed",
        handleBulkUploadCompleted as EventListener,
      );
    };
  }, [buildJavaSyncSource, fetchGeofenceList, zones]);

  const columns = useMemo(
    () => [
    {
      key: "identity",
      label: t("table.identity"),
      visible: true,
      render: (_: string, row: GeofenceZone) => (
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: row.color }}
          />
          <div className="min-w-0">
            <button
              type="button"
              className={`text-sm font-semibold truncate cursor-pointer hover:underline text-left ${
                isDark ? "text-foreground" : "text-gray-900"
              }`}
              onClick={() => router.push(`/geofence/${row.id}`)}
            >
              {row.displayName}
            </button>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}
              >
                {row.code}
              </span>
              <span
                className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                  isDark
                    ? "bg-gray-700 text-gray-300"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {row.classification.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "geometry",
      label: t("table.geometry"),
      visible: true,
      render: (value: GeofenceZone["geometry"]) => (
        <span
          className={`inline-flex items-center justify-center text-2xl font-bold leading-none ${
            isDark ? "text-gray-200" : "text-gray-700"
          }`}
        >
          {value === "circle" ? "○" : "⬠"}
        </span>
      ),
    },
    {
      key: "status",
      label: t("table.status"),
      visible: true,
      type: "badge" as const,
      render: (value: ZoneStatus) =>
        value === "enabled" ? "Active" : "Inactive",
    },
    {
      key: "javaSyncStatus",
      label: "JAVA SYNC",
      visible: true,
      render: (value: string, row: GeofenceZone) => {
        const normalizedStatus = String(
          value || GEOFENCE_JAVA_SYNC_STATUS.UNSYNCED,
        );
        const isSynced = normalizedStatus === GEOFENCE_JAVA_SYNC_STATUS.SYNCED;
        const isSyncing =
          normalizedStatus === GEOFENCE_JAVA_SYNC_STATUS.SYNCING ||
          syncingRowId === row.id;
        const badgeClasses = isSynced
          ? isDark
            ? "bg-emerald-900/30 text-emerald-300 border border-emerald-800"
            : "bg-white text-emerald-700 border border-emerald-400"
          : normalizedStatus === GEOFENCE_JAVA_SYNC_STATUS.FAILED
            ? isDark
              ? "bg-rose-900/30 text-rose-300 border border-rose-800"
              : "bg-white text-rose-700 border border-rose-400"
            : normalizedStatus === GEOFENCE_JAVA_SYNC_STATUS.SYNCING
              ? isDark
                ? "bg-amber-900/30 text-amber-300 border border-amber-800"
                : "bg-white text-amber-700 border border-amber-400"
              : isDark
                ? "bg-gray-800/50 text-gray-300 border border-gray-700"
                : "bg-white text-gray-700 border border-gray-300";

        return (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md ${badgeClasses}`}
              title={row.javaSyncMessage || normalizedStatus}
            >
              {normalizedStatus}
            </span>
            {!isSynced && (
              <button
                type="button"
                onClick={() => {
                  void handleSyncRow(row);
                }}
                disabled={isSyncing || syncingAll}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isDark
                    ? "border-gray-700 text-gray-200 hover:bg-gray-800"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <RefreshCw
                  className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`}
                />
                {isSyncing ? "Syncing" : "Sync"}
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: "createdAt",
      label: "CREATED AT",
      visible: true,
      render: (value: string) => formatStandardDate(value),
    },
    {
      key: "updatedAt",
      label: "UPDATED AT",
      visible: true,
      render: (value: string) => formatStandardDate(value),
    },
  ], [fetchGeofenceList, isDark, router, syncingAll, syncingRowId, t]);

  if (!canRead) {
    return (
      <div className={`${isDark ? "dark" : ""} mt-10`}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-foreground">{t("noReadPermission")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? "dark" : ""} mt-10`}>
      <div
        className={`min-h-screen ${isDark ? "bg-background" : ""} p-2 sm:p-0 md:p-2`}
      >
        <div className="mb-4 sm:mb-6">
          <PageHeader
            title={t("title")}
            subtitle={t("subtitle")}
            breadcrumbs={[
              { label: t("breadcrumbs.fleet") },
              { label: t("breadcrumbs.current") },
            ]}
            showButton={true}
            buttonText={t("addButton")}
            buttonRoute={`/geofence/0?returnTo=${encodeURIComponent("/geofence")}`}
            showExportButton={true}
            ExportbuttonText={t("export")}
            onExportClick={handleExport}
            showFilterButton={false}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative w-full sm:w-auto sm:min-w-[220px]">
            <Building2
              className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-gray-300" : "text-gray-500"}`}
            />
            <select
              value={selectedAccountId ?? ""}
              onChange={(e) => {
                const nextAccountId = Number(e.target.value);
                setSelectedAccountId(nextAccountId);
                setPageNo(1);
              }}
              className={`w-full appearance-none pl-10 pr-10 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                isDark
                  ? "bg-card border-gray-700 text-foreground"
                  : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              {accounts.length === 0 && (
                <option value={selectedAccountId ?? ""}>
                  {tDetail("fields.selectAccount")}
                </option>
              )}
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.value}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? "text-gray-300" : "text-gray-500"}`}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              void handleSyncAllUnsynced();
            }}
            disabled={syncingAll || loadingZones || zones.length === 0}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isDark
                ? "border-gray-700 text-gray-200 hover:bg-gray-800"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${syncingAll ? "animate-spin" : ""}`} />
            {syncingAll ? "Syncing..." : "Sync All Unsynced"}
          </button>
        </div>

        <div className="w-full">
          {loadingZones ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              {t("loading")}
            </div>
          ) : (
            <CommonTable
              columns={columns}
              data={zones.map((zone) => ({
                ...zone,
                identity: zone.displayName,
              }))}
              onEdit={handleEdit}
              onDelete={handleDelete}
              showActions={true}
              searchPlaceholder={t("searchPlaceholder")}
              rowsPerPageOptions={[5, 10, 25, 50]}
              pageNo={pageNo}
              pageSize={pageSize}
              onPageChange={setPageNo}
              onPageSizeChange={setPageSize}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              totalRecords={totalRecords}
              isServerSide={true}
            />
          )}
        </div>

        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setZoneToDelete(null);
          }}
          onConfirm={confirmDelete}
          title={t("deleteTitle")}
          message={t("deleteMessage", {
            name: zoneToDelete?.displayName || "",
          })}
          confirmText={t("confirmDelete")}
          cancelText={t("cancel")}
          type="danger"
          isDark={isDark}
        />
      </div>
    </div>
  );
}
