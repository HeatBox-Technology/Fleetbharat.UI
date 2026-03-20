export interface VehicleItem {
  vehicleId: number;
  registrationNumber: string;
  vinNumber?: string;
  vehicleType?: string;
  vehicleBrand?: string;
  ownershipBasis: "OWNED" | "LEASED";
  lessorName?: string;
  status: "IN_SERVICE" | "OFF_ROAD" | "OUT_OF_SERVICE";
  accountName?: string;
  updatedAt?: string;
}

export interface VehicleSummary {
  totalFleetSize: number;
  inService: number;
  offRoadOrOutOfService: number;
  activeAccounts: number;
}

// Full form data — mirrors all fields from the API response
export interface VehicleFormData {
  // Identification
  accountId: number;
  registrationNumber: string; // API: vehicleNumber
  vinNumber: string; // API: vinOrChassisNumber
  registrationDate: string; // API: registrationDate (ISO → date input string)

  // Classification
  vehicleTypeId: number;
  vehicleBrandId: number; // API: vehicleBrandOemId
  vehicleClass: string; // API: vehicleClass
  vehicleColor: string; // API: vehicleColor

  // Ownership
  ownershipBasis: "OWNED" | "LEASED"; // API: ownershipType ("Owned" | "Leased")
  leasedVendorId: number; // API: leasedVendorId
  lessorName: string; // not in API — UI only convenience field

  // Compliance & Documentation
  rtoPassing: string; // API: rtoPassing
  warranty: string; // API: warranty
  insurer: string; // API: insurer
  imageFilePath: string; // API: imageFilePath

  // Status
  status: boolean; // API: status ("Active" | "Inactive") → boolean
}

// What the API actually returns from getVehicleById
export interface VehicleApiResponse {
  id: number;
  accountId: number;
  vehicleNumber: string;
  vinOrChassisNumber?: string;
  registrationDate: string;
  vehicleTypeId: number;
  vehicleBrandOemId: number;
  ownershipType: string; // "Owned" | "Leased"
  leasedVendorId?: number;
  imageFilePath?: string;
  status: string; // "Active" | "Inactive"
  vehicleClass?: string;
  rtoPassing?: string;
  warranty?: string;
  insurer?: string;
  vehicleColor?: string;
  lessorName?: string;
}

export interface Account {
  id: number;
  value: string;
}

export interface VehicleType {
  id: number;
  vehicleTypeName: string;
}

export interface VehicleBrand {
  id: number;
  name: string;
}
