// White Label Interface
export interface WhiteLabel {
  whiteLabelId: number;
  accountId: number;
  accountName: string;
  customEntryFqdn: string;
  brandName?: string | null;
  logoUrl: string;
  logoPath?: string | null;
  primaryLogoPath?: string | null;
  primaryLogoUrl?: string | null;
  appLogoPath?: string | null;
  appLogoUrl?: string | null;
  mobileLogoPath?: string | null;
  mobileLogoUrl?: string | null;
  faviconPath?: string | null;
  faviconUrl?: string | null;
  logoDarkPath?: string | null;
  logoDarkUrl?: string | null;
  logoLightPath?: string | null;
  logoLightUrl?: string | null;
  primaryColorHex: string;
  secondaryColorHex: string;
  isActive: boolean;
  createdOn: string;
  updatedOn: string | null;
}

// White Label Form Data (for Add/Edit)
export interface WhiteLabelFormData {
  accountId: number;
  customEntryFqdn: string;
  brandName?: string | null;
  logoUrl: string;
  logoPath?: string | null;
  primaryLogoPath?: string | null;
  primaryLogoUrl?: string | null;
  appLogoPath?: string | null;
  appLogoUrl?: string | null;
  mobileLogoPath?: string | null;
  mobileLogoUrl?: string | null;
  faviconPath?: string | null;
  faviconUrl?: string | null;
  logoDarkPath?: string | null;
  logoDarkUrl?: string | null;
  logoLightPath?: string | null;
  logoLightUrl?: string | null;
  primaryColorHex: string;
  secondaryColorHex: string;
  isActive: boolean;
}

// White Label Update Data (PUT request)
export interface WhiteLabelUpdateData {
  customEntryFqdn: string;
  brandName?: string | null;
  logoUrl: string;
  logoPath?: string | null;
  primaryLogoPath?: string | null;
  primaryLogoUrl?: string | null;
  appLogoPath?: string | null;
  appLogoUrl?: string | null;
  mobileLogoPath?: string | null;
  mobileLogoUrl?: string | null;
  faviconPath?: string | null;
  faviconUrl?: string | null;
  logoDarkPath?: string | null;
  logoDarkUrl?: string | null;
  logoLightPath?: string | null;
  logoLightUrl?: string | null;
  primaryColorHex: string;
  secondaryColorHex: string;
  isActive: boolean;
}

// Paginated Response Interface
export interface WhiteLabelPaginatedResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    items: WhiteLabel[];
  };
}

// Single Item Response Interface
export interface WhiteLabelResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: WhiteLabel | null;
}
