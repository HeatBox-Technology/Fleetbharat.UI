export interface VehicleType {
  id: number;
  vehicleTypeName: string;
  category: string;
  defaultVehicleIcon: string;
  defaultAlarmIcon: string;
  defaultIconColor: string;
  seatingCapacity: number;
  wheelsCount: number;
  fuelCategory: string;
  tankCapacity: string;
  defaultSpeedLimit: string;
  defaultIdleThreshold: string;
  // status coming from backend may be "Active"/"Inactive" or boolean-like strings
  status: string;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface VehicleTypeFormData {
  code: string;
  displayName: string;
  speedLimit: number;
  idleThreshold: number;
  tankCapacity: number;
  iconSet: string;
  colorMode: "per-state" | "single";
  iconSize: "SM" | "MD" | "LG";
  description: string;
  isEnabled: boolean;
}

export interface VehicleTypeRow {
  id: number;
  code: string;
  name: string;
  mapVisualization: {
    dots: string[];
    label: string;
  };
  fuel: string;
  capacity: string;
  status: boolean;
  lastUpdated: string;
  raw: VehicleType;
}

export interface VehicleTypeCardCounts {
  total: number;
  active: number;
  pending: number;
  inactive: number;
}
