export interface CardProps {
  children: React.ReactNode;
  className?: string;
  isDark: boolean;
}

export interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }> | any;
  label: string;
  value: number;
  iconBgColor: string;
  iconColor: string;
  isDark: boolean;
}
