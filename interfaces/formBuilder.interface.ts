export type DynamicBuilderFieldType =
  | "text"
  | "email"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "checkbox";

export interface DynamicBuilderOption {
  label: string;
  value: string;
}

export interface DynamicBuilderField {
  id: string;
  type: DynamicBuilderFieldType;
  label: string;
  placeholder: string;
  required: boolean;
  order?: number;
  options?: DynamicBuilderOption[];
  validations?: {
    maxLength?: number;
  };
}

export interface DynamicFormSchema {
  layout: "single-column" | "two-column";
  fields: DynamicBuilderField[];
}

export interface FormBuilderItem {
  formBuilderId: number;
  accountId: number;
  fkFormId: number;
  formTitle: string;
  formCode: string;
  description: string;
  rawData: string;
  isActive: boolean;
  projectName?: string;
  accountName?: string;
  formName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FormBuilderPayload {
  accountId: number;
  fkFormId: number;
  formTitle: string;
  formCode: string;
  description: string;
  rawData: string;
  isActive: boolean;
  projectName: string;
  accountName: string;
  formName: string;
  createdByUser?: string;
  updatedByUser?: string;
}

export interface DeleteFormBuilderPayload {
  deletedByUser: string;
}
