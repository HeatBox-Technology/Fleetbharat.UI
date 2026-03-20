export type TripCycle = "weekly" | "monthly" | "one-off";

export type TripStatus = "active" | "in-transit" | "pending" | "completed";

export type VehicleType = "bike" | "van" | "truck" | "prime-mover";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TripStop {
  id: string;
  location: string;
  plannedEntry?: string; // 👈 now optional
  plannedExit?: string;
  coordinates?: LatLng;
}

export interface TripNotifications {
  whatsappDriver: boolean;
  whatsappConsignee: boolean;
  otpDriver: boolean;
  otpConsignee: boolean;
  smsAlerts: boolean;
  trackingLink: boolean;
}

export interface Trip {
  id: string;
  tripName: string;
  driverName: string;
  driverInitials: string;
  vehicleLabel: string; // e.g. "TRK-5541"
  vehicleType: VehicleType;
  cycle: TripCycle;
  status: TripStatus;
  consigneeName: string;
  departureTime: string; // ISO datetime
  expectedArrival: string; // ISO datetime
  stops: TripStop[];
  notifications: TripNotifications;
  createdAt: string;
}

export const MOCK_TRIPS: Trip[] = [
  {
    id: "1",
    tripName: "Delhi–Chandigarh Express",
    driverName: "Rajan Kumar",
    driverInitials: "RK",
    vehicleLabel: "TRK-5541",
    vehicleType: "truck",
    cycle: "weekly",
    status: "active",
    consigneeName: "Sharma Traders",
    departureTime: "2026-02-26T06:00:00",
    expectedArrival: "2026-02-26T11:00:00",
    stops: [
      {
        id: "s1",
        location: "Narela Warehouse, Delhi",
        plannedEntry: "2026-02-26T06:00:00",
        plannedExit: "2026-02-26T06:30:00",
      },
      {
        id: "s2",
        location: "Panipat Depot",
        plannedEntry: "2026-02-26T08:00:00",
        plannedExit: "2026-02-26T08:30:00",
      },
      {
        id: "s3",
        location: "Sharma Traders, Chandigarh",
        plannedEntry: "2026-02-26T11:00:00",
        plannedExit: "2026-02-26T11:30:00",
      },
    ],
    notifications: {
      whatsappDriver: true,
      whatsappConsignee: true,
      otpDriver: false,
      otpConsignee: false,
      smsAlerts: false,
      trackingLink: true,
    },
    createdAt: "2026-02-20T10:00:00",
  },
  {
    id: "2",
    tripName: "Mumbai–Pune Freight",
    driverName: "Amit Singh",
    driverInitials: "AS",
    vehicleLabel: "VAN-8890",
    vehicleType: "van",
    cycle: "monthly",
    status: "in-transit",
    consigneeName: "PQR Logistics",
    departureTime: "2026-02-26T07:00:00",
    expectedArrival: "2026-02-26T10:30:00",
    stops: [
      {
        id: "s1",
        location: "Andheri Hub, Mumbai",
        plannedEntry: "2026-02-26T07:00:00",
        plannedExit: "2026-02-26T07:20:00",
      },
      {
        id: "s2",
        location: "PQR Logistics, Pune",
        plannedEntry: "2026-02-26T10:30:00",
        plannedExit: "2026-02-26T11:00:00",
      },
    ],
    notifications: {
      whatsappDriver: true,
      whatsappConsignee: false,
      otpDriver: true,
      otpConsignee: false,
      smsAlerts: false,
      trackingLink: false,
    },
    createdAt: "2026-02-01T09:00:00",
  },
  {
    id: "3",
    tripName: "Gurugram–Jaipur Supply",
    driverName: "Vijay Tomar",
    driverInitials: "VT",
    vehicleLabel: "BIKE-123",
    vehicleType: "bike",
    cycle: "weekly",
    status: "pending",
    consigneeName: "ABC Retail Co.",
    departureTime: "2026-02-27T09:00:00",
    expectedArrival: "2026-02-27T14:00:00",
    stops: [
      {
        id: "s1",
        location: "Cyber Hub, Gurugram",
        plannedEntry: "2026-02-27T09:00:00",
        plannedExit: "2026-02-27T09:15:00",
      },
      {
        id: "s2",
        location: "ABC Retail, Jaipur",
        plannedEntry: "2026-02-27T14:00:00",
        plannedExit: "2026-02-27T14:30:00",
      },
    ],
    notifications: {
      whatsappDriver: false,
      whatsappConsignee: false,
      otpDriver: false,
      otpConsignee: false,
      smsAlerts: false,
      trackingLink: false,
    },
    createdAt: "2026-02-25T15:00:00",
  },
  {
    id: "4",
    tripName: "Mountain Supply Line",
    driverName: "Mohit Rana",
    driverInitials: "MR",
    vehicleLabel: "LOG-4001",
    vehicleType: "prime-mover",
    cycle: "monthly",
    status: "active",
    consigneeName: "Hill Depot Ltd.",
    departureTime: "2026-02-26T05:00:00",
    expectedArrival: "2026-02-26T18:00:00",
    stops: [
      {
        id: "s1",
        location: "Central Warehouse, Delhi",
        plannedEntry: "2026-02-26T05:00:00",
        plannedExit: "2026-02-26T05:45:00",
      },
      {
        id: "s2",
        location: "Chandigarh Relay",
        plannedEntry: "2026-02-26T09:00:00",
        plannedExit: "2026-02-26T09:30:00",
      },
      {
        id: "s3",
        location: "Hill Depot Ltd., Shimla",
        plannedEntry: "2026-02-26T18:00:00",
        plannedExit: "2026-02-26T18:30:00",
      },
    ],
    notifications: {
      whatsappDriver: true,
      whatsappConsignee: true,
      otpDriver: true,
      otpConsignee: true,
      smsAlerts: false,
      trackingLink: true,
    },
    createdAt: "2026-02-10T08:00:00",
  },
];

export const VEHICLE_ICON: Record<string, string> = {
  bike: "🏍",
  van: "🚐",
  truck: "🚛",
  "prime-mover": "🚚",
};

export const CYCLE_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  "one-off": "One-Off",
};

export const STATUS_CONFIG = {
  active: {
    label: "ACTIVE",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  "in-transit": {
    label: "IN TRANSIT",
    dot: "bg-yellow-400",
    badge:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  pending: {
    label: "PENDING",
    dot: "bg-orange-400",
    badge:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  completed: {
    label: "COMPLETED",
    dot: "bg-gray-400",
    badge: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  },
};

export const CYCLE_CONFIG = {
  weekly: {
    label: "WEEKLY",
    badge:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  monthly: {
    label: "MONTHLY",
    badge:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
  "one-off": {
    label: "ONE-OFF",
    badge: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  },
};

export const DRIVERS = [
  "Rajan Kumar",
  "Amit Singh",
  "Vijay Tomar",
  "Mohit Rana",
  "Suresh Pillai",
  "Deepak Yadav",
];

export const VEHICLES = [
  { label: "BIKE-123 — Rapid Courier 01", type: "bike", id: "BIKE-123" },
  { label: "VAN-8890 — Transit Van XL", type: "van", id: "VAN-8890" },
  { label: "TRK-5541 — Freight Titan", type: "truck", id: "TRK-5541" },
  {
    label: "LOG-4001 — Heavy Logistics Unit",
    type: "prime-mover",
    id: "LOG-4001",
  },
];
