"use client";

import { useContext } from "react";
import { AlertsContext } from "@/providers/AlertsProvider";

export type Severity = "Critical" | "High" | "Normal";

export interface Alert {
  id: string;
  orgId?: number;
  vehicleId: string;
  type: string;
  vehicleNo: string;
  status: string;
  gpsDate: string;
  receivedTime?: string;
  imei: string;
  deviceNo: string;
  latitude: number;
  longitude: number;
  address?: string;
  severity: Severity;
  read: boolean;
}

export interface AlertEnvelope {
  ok?: boolean;
  topic?: string;
  key?: string;
  data?: Partial<Alert> & Record<string, unknown>;
}

export interface AlertsContextValue {
  alerts: Alert[];
  unreadCount: number;
  connectionState: "idle" | "connecting" | "connected" | "disconnected" | "error";
  lastUpdatedAt: string | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  acknowledge: (id: string) => Promise<void>;
  clearAlerts: () => void;
}

export function useAlerts(): AlertsContextValue {
  const context = useContext(AlertsContext);

  if (!context) {
    throw new Error("useAlerts must be used within an AlertsProvider");
  }

  return context;
}
