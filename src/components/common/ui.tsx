import type { ReactNode, ButtonHTMLAttributes } from 'react';

type Variant = 'default' | 'primary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  default:
    'bg-surface-2 text-ink-1 border border-line-1 hover:border-line-2 hover:bg-surface-3',
  primary: 'bg-accent text-accent-ink border border-transparent hover:brightness-110',
  danger: 'bg-bad/12 text-bad border border-bad/35 hover:bg-bad/20',
  ghost: 'bg-transparent text-ink-2 border border-transparent hover:bg-surface-3 hover:text-ink-1',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
}

export function Button({ variant = 'default', block, className = '', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium
        transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${VARIANTS[variant]}
        ${block ? 'w-full' : ''} ${className}`}
    />
  );
}

interface TipButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  shortcut?: string;
  active?: boolean;
  placement?: 'top' | 'bottom';
  children: ReactNode;
}

/** Square icon button with a hover/focus tooltip — used by the canvas and title bars. */
export function TipButton({
  label,
  shortcut,
  active,
  placement = 'top',
  children,
  className = '',
  ...rest
}: TipButtonProps) {
  return (
    <span className="relative inline-flex group">
      <button
        {...rest}
        aria-label={label}
        aria-pressed={active}
        className={`h-8 w-8 inline-flex items-center justify-center rounded-sm transition-colors
          ${
            active
              ? 'bg-accent text-accent-ink'
              : 'text-ink-2 hover:bg-surface-3 hover:text-ink-1'
          } ${className}`}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-sm
          border border-line-1 bg-surface-2 px-2 py-1 text-[11px] text-ink-1 shadow-pop
          opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100
          ${placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
      >
        {label}
        {shortcut && (
          <kbd className="ml-1.5 rounded-xs bg-surface-3 px-1 py-0.5 font-mono text-[10px] text-ink-3">
            {shortcut}
          </kbd>
        )}
      </span>
    </span>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-3">{children}</h3>
      {right}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-md border border-line-1 bg-surface-2 ${className}`}>{children}</div>
  );
}

export function KeyValue({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="shrink-0 text-[11px] text-ink-3">{k}</span>
      <span className={`truncate text-xs text-ink-1 ${mono ? 'font-mono' : ''}`}>{v}</span>
    </div>
  );
}

type Tone = 'ok' | 'warn' | 'bad' | 'neutral' | 'accent';

const TONES: Record<Tone, string> = {
  ok: 'bg-ok/15 text-ok border-ok/30',
  warn: 'bg-warn/15 text-warn border-warn/30',
  bad: 'bg-bad/15 text-bad border-bad/30',
  neutral: 'bg-surface-3 text-ink-2 border-line-1',
  accent: 'bg-accent/15 text-accent border-accent/30',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-xs border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
