import { useStore } from '../../store';
import { TipButton } from '../common/ui';

const SunIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
  </svg>
);

const MoonIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7.5 7.5 0 1 0 10.5 10.5z" />
  </svg>
);

export default function TitleBar() {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const section = useStore((s) => s.section);
  const setSection = useStore((s) => s.setSection);

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-line-1 bg-surface-1 px-3">
      <div className="flex items-center gap-2.5">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="4.5" r="2.3" stroke="var(--accent)" strokeWidth="1.6" />
          <circle cx="4.5" cy="18" r="2.3" stroke="var(--accent)" strokeWidth="1.6" />
          <circle cx="19.5" cy="18" r="2.3" stroke="var(--accent)" strokeWidth="1.6" />
          <path d="M10.8 6.6L5.6 15.9M13.2 6.6l5.2 9.3M6.8 18h10.4" stroke="var(--ink-2)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight text-ink-1">NetLab Studio</div>
          <div className="text-[10px] text-ink-3">Interactive computer networks simulator</div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="mr-1 flex rounded-sm border border-line-1 bg-surface-2 p-0.5" role="tablist" aria-label="Workspace">
          {(
            [
              ['simulator', 'Simulator'],
              ['labs', 'Labs'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={section === id}
              onClick={() => setSection(id)}
              className={`rounded-xs px-2.5 py-1 text-[11px] font-medium transition-colors ${
                section === id ? 'bg-accent text-accent-ink' : 'text-ink-2 hover:bg-surface-3 hover:text-ink-1'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <TipButton
          label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? SunIcon : MoonIcon}
        </TipButton>
      </div>
    </header>
  );
}
