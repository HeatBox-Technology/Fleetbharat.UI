import { LucideIcon } from "lucide-react";

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  path?: string;
  pageUrl?: string;
  expandable?: boolean;
  children?: {
    id: string;
    label: string;
    icon: LucideIcon;
    path: string;
    pageUrl?: string;
  }[];
}

export interface SidebarSection {
  title: string;
  items: MenuItem[];
}

export interface HeaderClasses {
  bg?: string;
  border?: string;
  iconHover?: string;
  profileHover?: string;
  header: string;
  text: string;
  textSecondary: string;
  hover: string;
  // inputBg: string;
  inputBorder: string;
  inputText: string;
  hoverBg: string;
  dropdown: string;
  dropdownHover: string;
  useCustomBg: boolean;
  customBg?: string;
  inputPlaceholder?: string;
  logo?: string;
  logoText?: string;
  iconColor?: string;
}

export interface SidebarClasses {
  bg?: string;
  border: string;
  logo: string;
  logoText: string;
  brandText: string;
  sectionTitle: string;
  menuText: string;
  menuIcon: string;
  menuHover: string;
  activeMenuBg: string;
  activeMenuText: string;
  activeMenuIcon: string;
  chevron: string;
  gridIcon: string;
  gridHover: string;
  useCustomBg?: boolean;
  customBg?: string;
}
