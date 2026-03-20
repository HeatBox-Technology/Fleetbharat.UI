export interface OemManufacturer {
  id: number;
  code: string;
  displayName: string;
  officialWebsite: string;
  originCountry: string;
  supportEmail: string;
  supportHotline: string;
  description: string;
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OemManufacturerFormData {
  code: string;
  displayName: string;
  officialWebsite: string;
  originCountry: string;
  supportEmail: string;
  supportHotline: string;
  description: string;
  isEnabled: boolean;
  createdAt?: string;
}

export interface OemManufacturerRow {
  id: number;
  code: string;
  name: string;
  reach: {
    website: string;
    email: string;
  };
  status: boolean;
  lastUpdated: string;
}

export interface OemManufacturerCardCounts {
  total: number;
  active: number;
  pending: number;
  inactive: number;
}

export interface OemManufacturerPageData {
  items: OemManufacturer[];
  totalRecords: number;
  totalPages?: number;
  page?: number;
  pageSize?: number;
}
