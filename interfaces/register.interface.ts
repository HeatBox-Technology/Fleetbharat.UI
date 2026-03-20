export interface RegisterComponentProps {
  onSwitchToLogin: () => void;
}
export interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  mobileNo: string;
  countryCode: string;
  password: string;
  confirmPassword: string;
  refferalCode?: string;
}
