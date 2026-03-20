// Configuration Interface
export interface Configuration {
  accountConfigurationId: number;
  accountId: number;
  accountName: string;
  mapProvider: string;
  licenseKey?: string;
  addressKey?: string;
  dateFormat: string;
  timeFormat?: string;
  distanceUnit?: string;
  speedUnit?: string;
  fuelUnit?: string;
  temperatureUnit?: string;
  addressDisplay?: string;
  defaultLanguage: string;
  allowedLanguages?: string[];
  createdOn?: string;
  updatedOn?: string;
  isActive?: boolean;
}

// Configuration Form Data (for Add/Edit)
export interface ConfigurationFormData {
  accountId: number;
  mapProvider: string;
  licenseKey?: string;
  addressKey?: string;
  dateFormat: string;
  timeFormat?: string;
  distanceUnit?: string;
  speedUnit?: string;
  fuelUnit?: string;
  temperatureUnit?: string;
  addressDisplay?: string;
  defaultLanguage: string;
  allowedLanguages?: string[];
}

// API Response Interface
export interface ConfigurationResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data:
    | {
        page?: number;
        pageSize?: number;
        totalRecords?: number;
        totalPages?: number;
        items?: Configuration[];
      }
    | Configuration
    | null;
}
