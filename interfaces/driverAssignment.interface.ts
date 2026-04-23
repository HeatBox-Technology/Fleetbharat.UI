export interface DriverAssignment {
  assignmentId: number;
  driverId: string;
  driverName: string;
  driverCode: string;
  vehicleId: string;
  vehiclePlate: string;
  basis: "PRIMARY" | "TEMPORARY";
  startTime: string;
  endTime?: string;
  notes?: string;
  accountId: string;
  accountName: string;
  status: boolean;
}

export interface AssignmentMetric {
  total: number;
  active: number;
  temporary: number;
  expired: number;
}