"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Pencil, Trash2 } from "lucide-react";
import type { Trip } from "@/interfaces/trip.interface";
import {
  VEHICLE_ICON,
  STATUS_CONFIG,
  CYCLE_CONFIG,
} from "@/interfaces/trip.interface";

interface Props {
  trip: Trip;
  onEdit: (trip: Trip) => void;
  onDelete: (id: string) => void;
  onRowClick: (trip: Trip) => void;
}

const TripRow: React.FC<Props> = ({ trip, onEdit, onDelete, onRowClick }) => {
  const { isDark } = useTheme();
  const status = STATUS_CONFIG[trip.status];
  const cycle = CYCLE_CONFIG[trip.cycle];

  const notifFlags = [
    { key: "WA-D", active: trip.notifications.whatsappDriver },
    { key: "WA-C", active: trip.notifications.whatsappConsignee },
    { key: "OTP-D", active: trip.notifications.otpDriver },
    { key: "OTP-C", active: trip.notifications.otpConsignee },
  ];

  return (
    <div
      className={`grid items-center px-4 py-3.5 border-b cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
        isDark ? "border-gray-800" : "border-gray-100"
      }`}
      style={{ gridTemplateColumns: "2fr 1.5fr 1.4fr 0.9fr 1fr 1.2fr 72px" }}
      onClick={() => onRowClick(trip)}
    >
      {/* Trip identity */}
      <div className="min-w-0 pr-2">
        <p
          className={`text-sm font-semibold truncate ${isDark ? "text-foreground" : "text-gray-900"}`}
        >
          {trip.tripName}
        </p>
        <p
          className={`text-xs truncate mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
        >
          {trip.consigneeName}
        </p>
      </div>

      {/* Driver */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black border ${
            isDark
              ? "bg-indigo-900/30 border-indigo-700 text-indigo-300"
              : "bg-indigo-50 border-indigo-200 text-indigo-700"
          }`}
        >
          {trip.driverInitials}
        </div>
        <span
          className={`text-xs truncate ${isDark ? "text-gray-300" : "text-gray-700"}`}
        >
          {trip.driverName}
        </span>
      </div>

      {/* Vehicle */}
      <div
        className={`text-xs flex items-center gap-1.5 ${isDark ? "text-gray-300" : "text-gray-700"}`}
      >
        <span>{VEHICLE_ICON[trip.vehicleType]}</span>
        <span className="font-mono font-bold">{trip.vehicleLabel}</span>
      </div>

      {/* Cycle */}
      <div>
        <span
          className={`text-[10px] font-bold px-2 py-1 rounded-lg ${cycle.badge}`}
        >
          {cycle.label}
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`}
        />
        <span
          className={`text-[10px] font-bold px-2 py-1 rounded-lg ${status.badge}`}
        >
          {status.label}
        </span>
      </div>

      {/* OTP flags */}
      <div className="flex gap-1 flex-wrap">
        {notifFlags.map((f) => (
          <span
            key={f.key}
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              f.active
                ? isDark
                  ? "bg-emerald-900/30 text-emerald-400"
                  : "bg-emerald-100 text-emerald-700"
                : isDark
                  ? "bg-gray-800 text-gray-600"
                  : "bg-gray-100 text-gray-400"
            }`}
          >
            {f.key}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onEdit(trip)}
          className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${
            isDark
              ? "border-gray-700 text-gray-400 hover:border-indigo-600 hover:text-indigo-400"
              : "border-gray-200 text-gray-400 hover:border-indigo-400 hover:text-indigo-600"
          }`}
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={() => onDelete(trip.id)}
          className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${
            isDark
              ? "border-gray-700 text-gray-400 hover:border-red-800 hover:text-red-400"
              : "border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500"
          }`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default TripRow;
