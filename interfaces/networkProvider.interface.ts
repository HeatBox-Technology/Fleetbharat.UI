export interface NetworkProvider {
  id?: number;
  code?: string;
  displayName?: string;
  description?: string;
  isEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NetworkProviderFormData {
  code: string;
  displayName: string;
  description: string;
  isEnabled: boolean;
}