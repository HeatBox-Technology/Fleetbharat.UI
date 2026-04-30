"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { HubConnectionState, LogLevel } from "@microsoft/signalr";
import { toast } from "react-toastify";
import type {
  Alert,
  AlertEnvelope,
  AlertsContextValue,
  Severity,
} from "@/hooks/useAlerts";
import { getStoredAccountId } from "@/utils/storage";

const MAX_ALERTS = 50;
const SIGNALR_EVENT_NAMES = [
  "alerts",
  "ReceiveMessage",
  "ReceiveMessages",
  "ReceiveTracking",
  "ReceiveTrackingMessage",
  "ReceiveTrackingUpdate",
  "ReceiveAlert",
  "ReceiveAlerts",
  "alert_update",
  "AlertUpdate",
  "tracking",
];

const TRACKING_HUB_PATH = "/api/hubs/tracking";

export const AlertsContext = createContext<AlertsContextValue | null>(null);

const severityOrder: Record<Severity, number> = {
  Critical: 3,
  High: 2,
  Normal: 1,
};

const normalizeSeverity = (value: unknown): Severity => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "critical") return "Critical";
  if (raw === "high") return "High";
  return "Normal";
};

const asNumber = (value: unknown) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const asString = (value: unknown) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const toAbsoluteHubUrl = () => {
  const baseUrl = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!baseUrl) return TRACKING_HUB_PATH;

  const normalizedBase = baseUrl.replace(/\/+$/, "");
  return `${normalizedBase}${TRACKING_HUB_PATH}`;
};

const withAccessTokenQuery = (url: string, token: string) => {
  if (!token) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}access_token=${encodeURIComponent(token)}`;
};

const isAlertsEnvelope = (payload: unknown): payload is AlertEnvelope => {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "data" in payload &&
      "topic" in payload,
  );
};

const normalizeAlert = (payload: unknown): Alert | null => {
  const source = isAlertsEnvelope(payload)
    ? payload.topic === "alerts"
      ? payload.data
      : null
    : payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;

  if (!source) return null;

  const vehicleId = asString(source.vehicleId);
  const gpsDate = asString(source.gpsDate) || new Date().toISOString();
  const receivedTime = asString(source.receivedTime) || new Date().toISOString();
  const type = asString(source.type) || "Alert";
  const vehicleNo = asString(source.vehicleNo) || "Unknown Vehicle";

  return {
    id:
      asString(source.id) ||
      `${vehicleId || vehicleNo}-${type}-${receivedTime || gpsDate}`,
    orgId: asNumber(source.orgId) || undefined,
    vehicleId: vehicleId || asString(source.key) || vehicleNo,
    vehicleNo,
    deviceNo: asString(source.deviceNo),
    imei: asString(source.imei),
    type,
    status: asString(source.status) || "Active",
    latitude: asNumber(source.latitude),
    longitude: asNumber(source.longitude),
    address: asString(source.address),
    gpsDate,
    receivedTime,
    severity: normalizeSeverity(source.severity),
    read: false,
  };
};

const compareAlerts = (left: Alert, right: Alert) => {
  const leftRank = severityOrder[left.severity];
  const rightRank = severityOrder[right.severity];
  if (leftRank !== rightRank) return rightRank - leftRank;

  return (
    new Date(right.receivedTime || right.gpsDate).getTime() -
    new Date(left.receivedTime || left.gpsDate).getTime()
  );
};

const logAlertStream = (label: string, payload?: unknown) => {
  console.groupCollapsed(`[Alerts] ${label}`);
  if (payload !== undefined) {
    console.log(payload);
  }
  console.groupEnd();
};

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connectionState, setConnectionState] =
    useState<AlertsContextValue["connectionState"]>("idle");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const seenToastIds = useRef<Set<string>>(new Set());

  const markAsRead = useCallback((id: string) => {
    setAlerts((current) =>
      current.map((alert) => (alert.id === id ? { ...alert, read: true } : alert)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setAlerts((current) => current.map((alert) => ({ ...alert, read: true })));
  }, []);

  const acknowledge = useCallback(
    async (id: string) => {
      markAsRead(id);
    },
    [markAsRead],
  );

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  useEffect(() => {
    let isDisposed = false;
    let connectionRef: {
      stop: () => Promise<void>;
      on: (methodName: string, newMethod: (...args: unknown[]) => void) => void;
      off: (methodName: string, method?: (...args: unknown[]) => void) => void;
      onclose: (callback: () => void) => void;
      onreconnecting: (callback: () => void) => void;
      onreconnected: (callback: () => void) => void;
      start: () => Promise<void>;
      state: HubConnectionState;
    } | null = null;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("authToken") || ""
        : "";
    const orgId = getStoredAccountId();

    if (!token) {
      setConnectionState("disconnected");
      return;
    }

    const handleIncomingPayload = (eventName: string, ...args: unknown[]) => {
      logAlertStream(`Event received: ${eventName}`, args);
      const candidates = args.flatMap((arg) => (Array.isArray(arg) ? arg : [arg]));

      for (const candidate of candidates) {
        const nextAlert = normalizeAlert(candidate);
        if (!nextAlert) {
          logAlertStream(`Event ignored: ${eventName} (payload not recognized)`, candidate);
          continue;
        }

        logAlertStream(`Alert normalized from ${eventName}`, nextAlert);

        setAlerts((current) => {
          const withoutDuplicate = current.filter(
            (alert) => alert.id !== nextAlert.id,
          );
          return [nextAlert, ...withoutDuplicate]
            .sort(compareAlerts)
            .slice(0, MAX_ALERTS);
        });
        setLastUpdatedAt(new Date().toISOString());

        if (!seenToastIds.current.has(nextAlert.id)) {
          seenToastIds.current.add(nextAlert.id);
          toast.info(`${nextAlert.vehicleNo}: ${nextAlert.type} (${nextAlert.status})`);
        }
      }
    };

    const init = async () => {
      try {
        setConnectionState("connecting");
        const signalr = await import("@microsoft/signalr");
        if (isDisposed) return;

        const hubUrl = withAccessTokenQuery(toAbsoluteHubUrl(), token);
        logAlertStream("Connecting to tracking hub", {
          hubUrl,
          orgId,
          transport: "LongPolling",
          registeredEvents: SIGNALR_EVENT_NAMES,
        });
        const connection = new signalr.HubConnectionBuilder()
          .withUrl(hubUrl, {
            transport: signalr.HttpTransportType.LongPolling,
          })
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Information)
          .build();

        const registerHandlers = () => {
          SIGNALR_EVENT_NAMES.forEach((eventName) => {
            connection.on(eventName, (...args: unknown[]) =>
              handleIncomingPayload(eventName, ...args),
            );
          });

          connection.onreconnecting(() => {
            logAlertStream("Connection reconnecting");
            setConnectionState("connecting");
          });

          connection.onreconnected(() => {
            logAlertStream("Connection reconnected");
            setConnectionState("connected");
          });

          connection.onclose(() => {
            logAlertStream("Connection closed");
            if (!isDisposed) {
              setConnectionState("disconnected");
            }
          });
        };

        registerHandlers();
        connectionRef = connection;
        await connection.start();
        logAlertStream("Connection started successfully");

        if (orgId > 0) {
          try {
            logAlertStream("Invoking JoinOrg", { orgId });
            await connection.invoke("JoinOrg", orgId);
            logAlertStream("JoinOrg success", { orgId });
          } catch (error) {
            console.warn("Alerts hub JoinOrg failed.", error);
          }
        }

        try {
          logAlertStream("Invoking JoinTopic", { topic: "alerts" });
          await connection.invoke("JoinTopic", "alerts");
          logAlertStream("JoinTopic success", { topic: "alerts" });
        } catch (error) {
          console.warn("Alerts hub JoinTopic failed.", error);
        }

        if (!isDisposed) {
          setConnectionState("connected");
        }
      } catch (error) {
        console.error("Failed to connect to alerts hub:", error);
        if (!isDisposed) {
          setConnectionState("error");
        }
      }
    };

    void init();

    return () => {
      isDisposed = true;
      if (!connectionRef) return;

      SIGNALR_EVENT_NAMES.forEach((eventName) => {
        connectionRef?.off(eventName);
      });

      void connectionRef.stop();
    };
  }, []);

  const unreadCount = useMemo(
    () => alerts.reduce((count, alert) => count + (alert.read ? 0 : 1), 0),
    [alerts],
  );

  const value = useMemo<AlertsContextValue>(
    () => ({
      alerts,
      unreadCount,
      connectionState,
      lastUpdatedAt,
      markAsRead,
      markAllAsRead,
      acknowledge,
      clearAlerts,
    }),
    [
      acknowledge,
      alerts,
      clearAlerts,
      connectionState,
      lastUpdatedAt,
      markAllAsRead,
      markAsRead,
      unreadCount,
    ],
  );

  return (
    <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
  );
}
