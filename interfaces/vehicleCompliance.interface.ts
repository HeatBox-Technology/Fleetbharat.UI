export interface ComplianceSummary {
  totalDocuments: number;
  healthy: number;
  dueSoon: number;
  overdue: number;
}

export interface ComplianceItem {
  id: number;
  accountId: number;
  accountName: string;
  vehicleId: number;
  vehicleNumber: string;
  complianceType: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  reminderBeforeDays: number;
  status: "Healthy" | "DueSoon" | "Overdue";
  documentPath?: string | null;
  documentFileName?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ComplianceListResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data: {
    summary: ComplianceSummary;
    documents: {
      items: ComplianceItem[];
      totalRecords: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
}

export interface ComplianceFilters {
  accountId?: number;
  vehicleId?: number;
  complianceType?: string;
  status?: string;
  search?: string;
}

export interface ComplianceFormPayload {
  accountId: number;
  vehicleId: number;
  complianceType: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  reminderBeforeDays: number;
  documentPath?: string | null;
  documentFileName?: string | null;
  remarks?: string | null;
}

export interface ComplianceCreatePayload extends ComplianceFormPayload {
  createdBy: number;
}

export interface ComplianceUpdatePayload extends ComplianceFormPayload {
  updatedBy: number;
}

export interface ComplianceTypeOption {
  label: string;
  value: string;
}

export interface AccountOption {
  label: string;
  value: number;
}

export interface VehicleOption {
  label: string;
  value: number;
}

export const COMPLIANCE_TYPES: ComplianceTypeOption[] = [
  { label: "Insurance", value: "INSURANCE" },
  { label: "PUC", value: "PUC" },
  { label: "Permit", value: "PERMIT" },
  { label: "Fitness Certificate", value: "FITNESS" },
  { label: "Road Tax", value: "ROAD_TAX" },
  { label: "Registration Certificate", value: "RC" },
];

export const STATUS_OPTIONS: ComplianceTypeOption[] = [
  { label: "Healthy", value: "Healthy" },
  { label: "Due Soon", value: "DueSoon" },
  { label: "Overdue", value: "Overdue" },
];
