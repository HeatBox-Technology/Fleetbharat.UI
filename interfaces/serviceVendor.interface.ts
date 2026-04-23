export interface ServiceVendor {
  id: number;
  code: string;
  displayName: string;
  description: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface ServiceVendorFormData {
  code: string;
  displayName: string;
  description: string;
  isEnabled: boolean;
}