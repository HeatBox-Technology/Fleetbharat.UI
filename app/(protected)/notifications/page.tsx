"use client";

import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  CheckCheck,
  Info,
  Radio,
  Trash2,
} from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";

const severityConfig = {
  Critical: {
    icon: AlertCircle,
    badge: "bg-red-100 text-red-700",
    border: "border-red-200",
  },
  High: {
    icon: AlertTriangle,
    badge: "bg-orange-100 text-orange-700",
    border: "border-orange-200",
  },
  Normal: {
    icon: Info,
    badge: "bg-blue-100 text-blue-700",
    border: "border-blue-200",
  },
} as const;

const formatDateTime = (value?: string) => {
  if (!value) return "Just now";
  const next = new Date(value);
  if (Number.isNaN(next.getTime())) return value;
  return next.toLocaleString();
};

export default function NotificationsPage() {
  const {
    alerts,
    unreadCount,
    connectionState,
    markAsRead,
    markAllAsRead,
    clearAlerts,
  } = useAlerts();

  return (
    <div className="space-y-6 py-4">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gray-900 p-3 text-white">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Notifications
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Live alerts streaming from the tracking hub.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-sm text-gray-600">
              <Radio className="h-4 w-4" />
              <span>{connectionState}</span>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
              {unreadCount} unread
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
            <button
              type="button"
              onClick={clearAlerts}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear list
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center text-gray-500">
            No alerts have arrived from SignalR yet.
          </div>
        ) : (
          alerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={`rounded-3xl border bg-white p-5 shadow-sm transition ${config.border} ${alert.read ? "" : "ring-2 ring-blue-100"}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-gray-100 p-3">
                      <Icon className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {alert.type}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${config.badge}`}
                        >
                          {alert.severity}
                        </span>
                        {!alert.read && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            New
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {alert.vehicleNo} | Status: {alert.status}
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        Device: {alert.deviceNo || "-"} | IMEI: {alert.imei || "-"}
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        Coordinates: {alert.latitude}, {alert.longitude}
                      </div>
                      {alert.address && (
                        <div className="mt-2 text-sm text-gray-500">
                          Address: {alert.address}
                        </div>
                      )}
                      <div className="mt-2 text-sm text-gray-400">
                        GPS: {formatDateTime(alert.gpsDate)} | Received:{" "}
                        {formatDateTime(alert.receivedTime)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => markAsRead(alert.id)}
                      className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
                    >
                      Mark as read
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
