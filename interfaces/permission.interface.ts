export interface Permission {
  formId: number;
  formCode: string;
  formName: string;
  moduleName: string;
  pageUrl: string;
  isActive: boolean;
  resource: string; // for UI label
  read: boolean;
  write: boolean;
  delete: boolean;
  export: boolean;
  update: boolean;
  all?: boolean;
}

export interface RoleFormData {
  account: string;
  roleName: string;
  description: string;
  permissions: Permission[];
}

export interface RoleAccount {
  roleId: number;
  accountId: number;
  accountName: string;
  roleName: string;
  description: string;
  isSystemRole: boolean;
  assignedUsers: number;
  createdOn: Date;
}
