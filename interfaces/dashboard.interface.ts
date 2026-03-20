import { StaticImageData } from "next/image";

// ==================== Type Definitions ==================== //
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  isDark?: boolean;
}

export interface MetricCardProps {
  icon: React.ElementType | StaticImageData | string;
  label: string;
  value: number;
  iconBgColor: string;
  iconColor: string;
  isDark?: boolean;
}

export interface AlertItemProps {
  icon: React.ElementType;
  title: string;
  time: string;
  severity: string;
  iconBg: string;
  iconColor: string;
  isDark?: boolean;
}

export interface ServerStatusItemProps {
  name: string;
  status: "Operational" | "Outage";
  isDark?: boolean;
}
