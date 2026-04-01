import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import Panel from './Panel';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
type ModalTone = 'default' | 'brand' | 'danger';
type ModalLayer = 'modal' | 'top' | 'critical';

export const MODAL_FIELD_CLASS = 'w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none transition-all focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:border-indigo-500';
export const MODAL_FIELD_DANGER_CLASS = 'w-full bg-red-900/10 border border-red-500/50 rounded-lg p-3 text-red-100 outline-none transition-all focus-visible:ring-2 focus-visible:ring-red-400/70 focus-visible:border-red-500';

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-3xl'
};

const layerClasses: Record<ModalLayer, string> = {
  modal: 'z-[120]',
  top: 'z-[150]',
  critical: 'z-[200]'
};

const toneHeaderClasses: Record<ModalTone, string> = {
  default: 'border-white/10 bg-slate-900/50',
  brand: 'border-indigo-500/25 bg-indigo-950/35',
  danger: 'border-red-500/25 bg-red-950/25'
};

interface ModalShellProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  ariaLabel?: string;
  closeLabel?: string;
  size?: ModalSize;
  tone?: ModalTone;
  layer?: ModalLayer;
  maxWidthClass?: string;
  zIndexClass?: string;
}

export default function ModalShell({
  title,
  subtitle,
  children,
  footer,
  onClose,
  ariaLabel = 'Dialog',
  closeLabel = 'Close dialog',
  size = 'md',
  tone = 'default',
  layer = 'modal',
  maxWidthClass,
  zIndexClass
}: ModalShellProps) {
  const resolvedMaxWidthClass = maxWidthClass ?? sizeClasses[size];
  const resolvedZIndexClass = zIndexClass ?? layerClasses[layer];

  return (
    <div className={`fixed inset-0 ${resolvedZIndexClass} bg-black/80 backdrop-blur-sm flex items-center justify-center p-4`} role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <Panel className={`w-full ${resolvedMaxWidthClass} rounded-2xl shadow-2xl overflow-hidden`}>
        <div className={`flex justify-between items-center p-4 border-b ${toneHeaderClasses[tone]}`}>
          <div>
            <h2 className="text-xl font-black italic text-white tracking-wider">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label={closeLabel} className="p-2 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">{children}</div>

        {footer && <div className="p-4 bg-slate-900/45 border-t border-white/10">{footer}</div>}
      </Panel>
    </div>
  );
}

