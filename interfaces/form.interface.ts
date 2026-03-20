export interface FormMasterItem {
  formId: number;
  formCode: string;
  formName: string;
  moduleName: string;
  pageUrl: string;
  iconName?: string;
  sortOrder?: number;
  isMenu?: boolean;
  isBulk?: boolean;
  isVisible?: boolean;
  isActive: boolean;
  formModuleId?: number;
  filterConfigJson?: string;
}

export interface FormMasterPayload {
  formCode: string;
  formName: string;
  moduleName: string;
  pageUrl: string;
  iconName: string;
  sortOrder: number;
  isMenu: boolean;
  isBulk: boolean;
  isVisible: boolean;
  isActive: boolean;
  formModuleId: number;
  filterConfigJson: string;
}
