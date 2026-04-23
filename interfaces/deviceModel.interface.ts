export interface DeviceModel {
  id: number;
  code: string;
  displayName: string;
  description: string;
  manufacturerId: number;
  manufacturerName: string;
  deviceCategoryId: number;
  deviceCategoryName: string;
  protocolType: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface DeviceModelFormData {
  code: string;
  displayName: string;
  description: string;
  manufacturerId: number;
  deviceCategoryId: number;
  protocolType: string;
  isEnabled: boolean;
}

export interface LookupOption {
  id: number;
  name: string;
}