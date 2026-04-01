import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 shadow-lg shadow-indigo-900/25',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600/70',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow-lg shadow-emerald-900/25',
  warning: 'bg-amber-700 hover:bg-amber-600 text-white border border-amber-500/50 shadow-lg shadow-amber-900/20',
  danger: 'bg-red-600 hover:bg-red-500 text-white border border-red-400/40 shadow-lg shadow-red-900/20',
  ghost: 'bg-transparent hover:bg-white/10 text-slate-300 border border-transparent'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-sm'
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg font-bold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${variantClasses[variant]} ${sizeClasses[size]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

