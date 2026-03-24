// table.interface.ts

export interface Column {
  key: string;
  label: string;
  type?: "text" | "badge" | "link" | "icon-text" | "multi-line" | "date";
  visible?: boolean;
  icon?: React.ReactNode;
  mainStyle?: string;
  subStyle?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface CommonTableProps {
  columns: Column[];
  data: any[];
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  isEditDisabled?: (row: any) => boolean;
  isDeleteDisabled?: (row: any) => boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onStatusToggle?: (row: any) => void;
  showActions?: boolean;
  searchPlaceholder?: string;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  variant?: "default" | "simple";
  pageNo: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  totalRecords?: number;
  isServerSide?: boolean;
}

export interface HierarchyNode {
  id: string;
  name: string;
  type: string;
  code: string;
  status: string;
  managed: string;
  avatar?: string;
  avatarColor?: string;
  children?: HierarchyNode[];
}

export interface HierarchicalTableProps {
  title?: string;
  subtitle?: string;
  data: HierarchyNode[];
  onEdit?: (node: HierarchyNode) => void;
  showSearch?: boolean;
}
