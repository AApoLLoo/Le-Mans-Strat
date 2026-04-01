import type { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'info' | 'success' | 'warning' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  info: 'text-indigo-200 border-indigo-500/30 bg-indigo-900/30',
  success: 'text-emerald-200 border-emerald-500/30 bg-emerald-900/25',
  warning: 'text-amber-200 border-amber-500/30 bg-amber-900/25',
  danger: 'text-red-200 border-red-500/30 bg-red-900/25'
};

export default function Badge({ variant = 'info', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

