export interface InstanceData {
  main: string;
  sub: string;
}

export interface ContactData {
  main: string;
  sub: string;
}

export interface AccountData {
  accountId: number;
  no: number;
  code: string;
  instance: InstanceData;
  contact: ContactData;
  location: string;
  status: string;
}

export interface FormData {
  accountName: string;
  accountCode: string;
  categoryId: number;
  primaryDomain: string;
  fullName: string;
  emailAddress: string;
  phoneNumber: string;
  location: string;
}

export interface Category {
  categoryId: number;
  labelName: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface FormRights {
  formId: number;
  formCode: string;
  formName: string;
  pageUrl: string;
  icon: string;
  canRead: boolean;
  canWrite: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  canAll: boolean;
}

// account.interface.ts (or same file)

export interface AccountCardCounts {
  total: number;
  active: number;
  pending: number;
  inactive: number;
}

export interface AccountsApiResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    pageData: {
      page: number;
      pageSize: number;
      totalRecords: number;
      totalPages: number;
      items: AccountData[];
    };
    cardCounts: AccountCardCounts;
  };
}
