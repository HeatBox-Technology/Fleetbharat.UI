export interface DeviceType {
  id: number;
  oemmanufacturerId: number;
  code: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  isActive: boolean;
  isDeleted?: boolean;
  createdBy?: number | string;
  createdAt?: string;
  updatedBy?: number | null;
  updatedAt?: string | null;
  oemManufacturerName?: string;
}

export interface DeviceTypeFormData {
  code: string;
  oemmanufacturerId: number;
  name: string;
  description: string;
  createdBy: number;
  isEnabled: boolean;
}

export interface DeviceTypeCreatePayload {
  code: string;
  oemmanufacturerId: number;
  name: string;
  description: string;
  createdBy: number;
}

export interface DeviceTypeUpdatePayload {
  id: number;
  oemmanufacturerId: number;
  code: string;
  name: string;
  description: string;
  isEnabled: boolean;
  isActive: boolean;
  updatedBy: number;
}

export interface DeviceTypeRow {
  id: number;
  code: string;
  name: string;
  status: boolean;
  lastUpdated: string;
}

export interface DeviceTypeCardCounts {
  total: number;
  active: number;
  pending: number;
  inactive: number;
}
