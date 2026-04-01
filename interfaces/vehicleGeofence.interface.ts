export interface VehicleGeofenceSummary {
  totalAssignments: number;
  active: number;
  inactive: number;
}

export interface VehicleGeofenceItem {
  id: number;
  accountId: number;
  vehicleId: number;
  geofenceId: number;
  vehicleNo: string;
  deviceNo?: string;
  DeviceNo?: string;
  deviceNumber?: string;
  DeviceNumber?: string;
  imei?: string;
  Imei?: string;
  geofenceName: string;
  geometryType: string;
  isActive: boolean;
  isDeleted: boolean;
  remarks: string;
  createdBy: number;
  createdAt: string;
  updatedBy?: number | null;
  updatedAt?: string | null;
}

export interface VehicleGeofenceRow {
  id: number;
  accountId: number;
  vehicleId: number;
  geofenceId: number;
  vehicleNo: string;
  deviceNo?: string;
  geofenceName: string;
  geometryType: string;
  status: string;
  remarks: string;
  createdAt: string;
}
