interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  showButton?: boolean;
  buttonText?: string;
  buttonIcon?: React.ReactNode;
  onButtonClick?: () => void;
  buttonRoute?: string;
  showExportButton?: boolean;
  ExportbuttonText?: string;
  onExportClick?: () => void;
  showFilterButton?: boolean;
  FilterbuttonText?: string;
  onFilterClick?: () => void;
  showWriteButton?: boolean;
  showBulkUpload?: boolean;
  bulkUploadModuleKey?: string;
  exportFormat?: "excel" | "csv";
  onExportFormatChange?: (format: "excel" | "csv") => void;
}
