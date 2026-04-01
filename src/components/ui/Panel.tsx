import type { HTMLAttributes, ReactNode } from 'react';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function Panel({ className = '', children, ...props }: PanelProps) {
  return (
    <div className={`fbt-panel ${className}`} {...props}>
      {children}
    </div>
  );
}

