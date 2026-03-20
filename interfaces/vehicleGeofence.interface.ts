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
  vehicleNo: string;
  geofenceName: string;
  geometryType: string;
  status: string;
  remarks: string;
  createdAt: string;
}
