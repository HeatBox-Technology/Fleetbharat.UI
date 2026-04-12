export interface VehicleType {
  id: number;
  accountId?: number;
  accountName?: string;
  vehicleTypeName: string;
  category: string;
  movingIcon: string | null;
  stoppedIcon: string | null;
  idleIcon: string | null;
  parkedIcon: string | null;
  offlineIcon: string | null;
  breakdownIcon: string | null;
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
  accountId: number;
  category: string;
  speedLimit: number;
  idleThreshold: number;
  tankCapacity: number;
  seatingCapacity: number;
  wheelsCount: number;
  fuelCategory: string;
  description: string;
  isEnabled: boolean;
}

export interface VehicleTypeRow {
  id: number;
  code: string;
  name: string;
  stateIcons: string[];
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
