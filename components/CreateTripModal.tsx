"use client";

import React, { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { X, MapPin, Plus, Trash2 } from "lucide-react";
import type {
  Trip,
  TripCycle,
  TripStop,
  TripNotifications,
} from "@/interfaces/trip.interface";
import { DRIVERS, VEHICLES, VEHICLE_ICON } from "@/interfaces/trip.interface";

/* ──────────────────────────── props ──────────────────────────── */

interface Props {
  onClose: () => void;
  onSave: (trip: Trip) => void;
  existingCount: number;
  defaultTrip?: Partial<Trip>; // for edit mode
}

/* ──────────────────────────── helpers ──────────────────────────── */

const makeStop = (): TripStop => ({
  id: Date.now().toString() + Math.random(),
  location: "",
  plannedEntry: "",
  plannedExit: "",
});

/* ──────────────────────────── component ──────────────────────────── */

const CreateTripModal: React.FC<Props> = ({
  onClose,
  onSave,
  existingCount,
  defaultTrip,
}) => {
  const { isDark } = useTheme();

  // Form state
  const [tripName, setTripName] = useState(defaultTrip?.tripName ?? "");
  const [consigneeName, setConsigneeName] = useState(
    defaultTrip?.consigneeName ?? "",
  );
  const [driverName, setDriverName] = useState(defaultTrip?.driverName ?? "");
  const [vehicleId, setVehicleId] = useState(defaultTrip?.vehicleLabel ?? "");
  const [cycle, setCycle] = useState<TripCycle>(defaultTrip?.cycle ?? "weekly");
  const [departure, setDeparture] = useState(defaultTrip?.departureTime ?? "");
  const [arrival, setArrival] = useState(defaultTrip?.expectedArrival ?? "");

  // Stops: source + intermediates + destination kept as array
  const [stops, setStops] = useState<TripStop[]>(
    defaultTrip?.stops ?? [makeStop(), makeStop()],
  );

  // Notifications
  const [notif, setNotif] = useState<TripNotifications>(
    defaultTrip?.notifications ?? {
      whatsappDriver: true,
      whatsappConsignee: true,
      otpDriver: false,
      otpConsignee: false,
      smsAlerts: false,
      trackingLink: false,
    },
  );

  /* ── stop helpers ── */
  const updateStop = (idx: number, field: keyof TripStop, val: string) => {
    setStops((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)),
    );
  };

  const addStop = () => {
    setStops((prev) => [
      ...prev.slice(0, -1),
      makeStop(),
      prev[prev.length - 1],
    ]);
  };

  const removeStop = (idx: number) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ── commit ── */
  const handleCommit = () => {
    const vehicle = VEHICLES.find((v) => v.id === vehicleId);
    const initials = driverName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const trip: Trip = {
      id: defaultTrip?.id ?? Date.now().toString(),
      tripName,
      consigneeName,
      driverName,
      driverInitials: initials,
      vehicleLabel: vehicleId,
      vehicleType: (vehicle?.type ?? "truck") as Trip["vehicleType"],
      cycle,
      status: defaultTrip?.status ?? "pending",
      departureTime: departure,
      expectedArrival: arrival,
      stops,
      notifications: notif,
      createdAt: defaultTrip?.createdAt ?? new Date().toISOString(),
    };
    onSave(trip);
  };

  const isValid =
    tripName.trim() &&
    driverName &&
    vehicleId &&
    stops[0].location &&
    stops[stops.length - 1].location;

  /* ── style helpers ── */
  const inputCls = `w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
    isDark
      ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
      : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
  }`;

  const labelCls = `block text-[10px] font-bold tracking-widest mb-1.5 ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`;

  const sectionTitleCls = `text-[10px] font-bold tracking-widest ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`;

  /* ── notification checkbox item ── */
  const NotifItem = ({
    field,
    label,
    sub,
  }: {
    field: keyof TripNotifications;
    label: string;
    sub: string;
  }) => (
    <div
      onClick={() => setNotif((p) => ({ ...p, [field]: !p[field] }))}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
        notif[field]
          ? isDark
            ? "border-emerald-800 bg-emerald-900/10"
            : "border-emerald-300 bg-emerald-50"
          : isDark
            ? "border-gray-700 hover:border-gray-600"
            : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* custom checkbox */}
      <div
        className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${
          notif[field]
            ? "bg-emerald-500 border-emerald-500"
            : isDark
              ? "border-gray-600"
              : "border-gray-300"
        }`}
      >
        {notif[field] && (
          <svg
            className="w-2.5 h-2.5 text-white"
            fill="none"
            viewBox="0 0 10 10"
          >
            <path
              d="M1.5 5l2.5 2.5 4.5-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div>
        <p
          className={`text-xs font-semibold ${isDark ? "text-foreground" : "text-gray-800"}`}
        >
          {label}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );

  /* ── render ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm">
      <div
        className={`relative h-full w-full max-w-lg flex flex-col shadow-2xl ${
          isDark ? "bg-gray-900" : "bg-white"
        }`}
        style={{ animation: "slideInRight 0.25s ease" }}
      >
        {/* ── Header ── */}
        <div
          className={`flex items-center gap-3 px-5 py-4 border-b flex-shrink-0 ${
            isDark ? "border-gray-800" : "border-gray-100"
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base select-none">
            🚛
          </div>
          <div>
            <h2
              className={`text-base font-bold ${isDark ? "text-foreground" : "text-gray-900"}`}
            >
              {defaultTrip?.id ? "Edit Trip" : "Create New Trip"}
            </h2>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
              Trip Master — Mission Architect
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* 01 — Trip Identity */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gray-400 text-xs">①</span>
              <h3 className={sectionTitleCls}>TRIP IDENTITY</h3>
              <div
                className={`flex-1 h-px ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>
                  TRIP NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delhi–Chandigarh Express"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>
                  CONSIGNEE NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Traders"
                  value={consigneeName}
                  onChange={(e) => setConsigneeName(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* 02 — Driver & Vehicle */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gray-400 text-xs">②</span>
              <h3 className={sectionTitleCls}>DRIVER &amp; VEHICLE</h3>
              <div
                className={`flex-1 h-px ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>
                  DRIVER NAME <span className="text-red-500">*</span>
                </label>
                <select
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Select Driver —</option>
                  {DRIVERS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  VEHICLE <span className="text-red-500">*</span>
                </label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Select Vehicle —</option>
                  {VEHICLES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {VEHICLE_ICON[v.type]} {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 03 — Trip Cycle */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gray-400 text-xs">③</span>
              <h3 className={sectionTitleCls}>TRIP CYCLE</h3>
              <div
                className={`flex-1 h-px ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
              />
            </div>

            {/* Cycle toggle — matches GeofencePage geometry selector style */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {(["weekly", "monthly", "one-off"] as TripCycle[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all ${
                    cycle === c
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10"
                      : isDark
                        ? "border-gray-700 hover:border-gray-600"
                        : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">
                    {c === "weekly" ? "◉" : c === "monthly" ? "◎" : "⊙"}
                  </span>
                  <p
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      cycle === c
                        ? "text-indigo-600 dark:text-indigo-400"
                        : isDark
                          ? "text-gray-400"
                          : "text-gray-500"
                    }`}
                  >
                    {c}
                  </p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>DEPARTURE DATE &amp; TIME</label>
                <input
                  type="datetime-local"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>EXPECTED ARRIVAL</label>
                <input
                  type="datetime-local"
                  value={arrival}
                  onChange={(e) => setArrival(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* 04 — Route Stops — mirrors image 3 timeline style */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gray-400 text-xs">④</span>
              <h3 className={sectionTitleCls}>ROUTE STOPS</h3>
              <div
                className={`flex-1 h-px ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
              />
            </div>

            <div className="relative">
              {/* Vertical timeline line */}
              <div
                className={`absolute left-[9px] top-4 bottom-4 w-0.5 ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
              />

              <div className="space-y-4">
                {stops.map((stop, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === stops.length - 1;
                  const isIntermediate = !isFirst && !isLast;

                  return (
                    <div key={stop.id} className="flex gap-4">
                      {/* Timeline dot */}
                      <div className="relative z-10 flex-shrink-0 mt-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isFirst
                              ? "bg-indigo-600 border-indigo-600"
                              : isLast
                                ? "bg-orange-500 border-orange-500"
                                : isDark
                                  ? "bg-gray-800 border-yellow-500"
                                  : "bg-white border-yellow-500"
                          }`}
                        >
                          {isFirst && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                          {isLast && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                          {isIntermediate && (
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                          )}
                        </div>
                      </div>

                      {/* Stop fields */}
                      <div
                        className={`flex-1 pb-2 rounded-xl border p-3 ${
                          isDark
                            ? "border-gray-700 bg-gray-800/40"
                            : "border-gray-200 bg-gray-50/60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[10px] font-bold tracking-widest ${
                              isFirst
                                ? "text-indigo-500"
                                : isLast
                                  ? "text-orange-500"
                                  : "text-yellow-600"
                            }`}
                          >
                            {isFirst
                              ? "📍 SOURCE"
                              : isLast
                                ? "🏁 DESTINATION"
                                : `📌 STOP ${idx}`}
                          </span>
                          {isIntermediate && (
                            <button
                              onClick={() => removeStop(idx)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder={
                            isFirst
                              ? "Enter source location"
                              : isLast
                                ? "Enter destination location"
                                : "Enter stop location"
                          }
                          value={stop.location}
                          onChange={(e) =>
                            updateStop(idx, "location", e.target.value)
                          }
                          className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 mb-2 ${
                            isDark
                              ? "bg-gray-800 border-gray-700 text-foreground placeholder-gray-500"
                              : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                          }`}
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label
                              className={`block text-[9px] font-bold tracking-widest mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                            >
                              PLANNED ENTRY
                            </label>
                            <input
                              type="datetime-local"
                              value={stop.plannedEntry}
                              onChange={(e) =>
                                updateStop(idx, "plannedEntry", e.target.value)
                              }
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                                isDark
                                  ? "bg-gray-800 border-gray-700 text-foreground"
                                  : "bg-white border-gray-200 text-gray-800"
                              }`}
                            />
                          </div>
                          <div>
                            <label
                              className={`block text-[9px] font-bold tracking-widest mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                            >
                              PLANNED EXIT
                            </label>
                            <input
                              type="datetime-local"
                              value={stop.plannedExit}
                              onChange={(e) =>
                                updateStop(idx, "plannedExit", e.target.value)
                              }
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                                isDark
                                  ? "bg-gray-800 border-gray-700 text-foreground"
                                  : "bg-white border-gray-200 text-gray-800"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add stop button */}
              <button
                onClick={addStop}
                className={`mt-3 ml-9 flex items-center gap-2 text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition-colors`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Intermediate Stop
              </button>
            </div>
          </section>

          {/* 05 — OTP & Notifications */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gray-400 text-xs">⑤</span>
              <h3 className={sectionTitleCls}>OTP &amp; NOTIFICATIONS</h3>
              <div
                className={`flex-1 h-px ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <NotifItem
                field="whatsappDriver"
                label="WhatsApp — Driver"
                sub="Send trip info & OTP to driver"
              />
              <NotifItem
                field="whatsappConsignee"
                label="WhatsApp — Consignee"
                sub="Notify consignee on dispatch"
              />
              <NotifItem
                field="otpDriver"
                label="OTP Verify — Driver"
                sub="Driver confirms trip via OTP"
              />
              <NotifItem
                field="otpConsignee"
                label="OTP Verify — Consignee"
                sub="Consignee confirms delivery"
              />
              <NotifItem
                field="smsAlerts"
                label="SMS Alerts"
                sub="Fallback SMS for all stops"
              />
              <NotifItem
                field="trackingLink"
                label="Live Tracking Link"
                sub="Share tracking URL to consignee"
              />
            </div>
          </section>
        </div>

        {/* ── Footer ── */}
        <div
          className={`flex items-center gap-3 px-5 py-4 border-t flex-shrink-0 ${
            isDark ? "border-gray-800" : "border-gray-100"
          }`}
        >
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm border transition-colors ${
              isDark
                ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            DISCARD
          </button>
          <button
            onClick={handleCommit}
            disabled={!isValid}
            className="flex-[2] py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            🚀 DEPLOY TRIP
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTripModal;
