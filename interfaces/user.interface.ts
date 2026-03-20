export interface UserFormData {
  accountName: string;
  accountCode: string;
  userName: string;
  password: string;
  accountId: number;
  primaryDomain: string;
  fullName: string;
  emailAddress: string;
  phoneNumber: string;
  location: string;
  roleId: number;
  avatar?: string; // Avatar URL or base64 string
  avatarFile?: File | null; // Avatar file for upload
}

export interface UserItem {
  userId: string;
  fullName: string;
  email: string;
  roleId: number;
  roleName: string;
  accountId: number;
  accountName: string;
  status: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  avatar?: string; // Avatar URL for display
}
