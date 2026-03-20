// Plan Interface
export interface PlanData {
  planId: string;
  no: number;
  planName: string;
  tenantCategory?: string;
  initialBasePrice?: string;
  isActive?: string;
}

export interface CardProps {
  children: React.ReactNode;
  isDark: boolean;
}

export interface Currency {
  id: number;
  value: string; // Format: "USD - US Dollar ($)"
}

export interface FormModule {
  id: number;
  value: string; // Format: "Live-Tracking", "Driver-Behavior", etc.
}

export interface TenantCategory {
  id: number;
  name: string;
  displayName: string;
}
