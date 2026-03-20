export type Vehicle = {
  id: string; // vehicleId / deviceId / number plate
  name?: string; // display name
  lat: number;
  lng: number;
  speed?: number;
  heading?: number; // degrees
  timestamp?: string;
  status?: string; // online/offline/ignition etc
  [key: string]: any;
};

export type RoutePoint = {
  lat: number;
  lng: number;
  timestamp?: string;
  speed?: number;
  heading?: number;
  [key: string]: any;
};
