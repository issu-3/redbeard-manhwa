import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'outline';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-card text-text-secondary border border-border',
  success:
    'bg-success/15 text-success border border-success/25',
  warning:
    'bg-warning/15 text-warning border border-warning/25',
  danger:
    'bg-danger/15 text-danger border border-danger/25',
  info:
    'bg-info/15 text-info border border-info/25',
  primary:
    'bg-primary/15 text-primary border border-primary/25',
  outline:
    'bg-transparent text-text-secondary border border-border',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px] leading-tight',
  md: 'px-2.5 py-1 text-xs leading-tight',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
