export interface DropdownOption {
  id: number;
  value: string;
}

export interface RouteMasterRow {
  id: number;
  routeName: string;
  accountName: string;
  startPoint: string;
  endPoint: string;
  stopsCount: number;
  isGeofenceRelated: boolean;
  status: string;
  createdAt: string;
}

export interface RouteSummary {
  totalRoutes: number;
  totalActiveRoutes: number;
  totalInactiveRoutes: number;
}

export interface RouteMasterFormData {
  accountId: number;
  routeName: string;
  isGeofenceRelated: boolean;
  startGeofenceId: number;
  endGeofenceId: number;
  stopGeofenceIds: number[];
  isActive: boolean;
}
