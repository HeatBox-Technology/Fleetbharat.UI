"use client";

import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronRight,
  Info,
  MapPin,
  Radio,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Alert } from "@/hooks/useAlerts";
import { useAlerts } from "@/hooks/useAlerts";

type NotificationCenterProps = {
  buttonClassName: string;
  iconClassName: string;
};

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const severityConfig = {
  Critical: {
    color: "text-red-600",
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
  High: {
    color: "text-orange-600",
    bg: "bg-orange-50",
    badge: "bg-orange-100 text-orange-700",
    icon: AlertTriangle,
  },
  Normal: {
    color: "text-blue-600",
    bg: "bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    icon: Info,
  },
} as const;

const formatDateTime = (value?: string) => {
  if (!value) return "Just now";
  const next = new Date(value);
  if (Number.isNaN(next.getTime())) return value;
  return next.toLocaleString();
};

export default function NotificationCenter({
  buttonClassName,
  iconClassName,
}: NotificationCenterProps) {
  const {
    alerts,
    unreadCount,
    connectionState,
    markAsRead,
    markAllAsRead,
    acknowledge,
  } = useAlerts();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const recentAlerts = useMemo(() => alerts.slice(0, 5), [alerts]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const statusLabel =
    connectionState === "connected"
      ? "Live"
      : connectionState === "connecting"
        ? "Connecting"
        : connectionState === "error"
          ? "Connection error"
          : "Offline";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cn("relative", buttonClassName)}
        aria-label="Notifications"
      >
        <Bell className={iconClassName} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-[380px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">Alerts</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                <Radio className="h-3.5 w-3.5" />
                <span>{statusLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={markAllAsRead}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {recentAlerts.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-gray-500">
                No live alerts received yet.
              </div>
            ) : (
              recentAlerts.map((alert) => {
                const config = severityConfig[alert.severity];
                const Icon = config.icon;

                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => {
                      markAsRead(alert.id);
                      setSelectedAlert(alert);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-gray-100 px-4 py-4 text-left transition hover:bg-gray-50",
                      !alert.read && "bg-blue-50/40",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        config.bg,
                        config.color,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {alert.type}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {alert.vehicleNo}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[10px] font-semibold",
                            config.badge,
                          )}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>
                          {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        {formatDateTime(alert.receivedTime || alert.gpsDate)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedAlert && (
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {selectedAlert.vehicleNo}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {selectedAlert.type} | {selectedAlert.status}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    IMEI: {selectedAlert.imei || "-"} | Device:{" "}
                    {selectedAlert.deviceNo || "-"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void acknowledge(selectedAlert.id)}
                  className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-700"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 p-3">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/notifications");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              View all alerts
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
