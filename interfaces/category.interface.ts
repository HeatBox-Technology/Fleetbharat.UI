// Category Interface
export interface Category {
  categoryId: number;
  labelName: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

// Category Form Data (for Add/Edit)
export interface CategoryFormData {
  labelName: string;
  description?: string;
  isActive?: boolean;
}

// API Response Interface
export interface CategoryResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Category[] | Category | null;
}
