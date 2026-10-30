import { useStore } from '../../store';
import PacketLog from './PacketLog';
import ResizeHandle from '../layout/ResizeHandle';
import { TipButton } from '../common/ui';

const ChevronDown = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const ChevronUp = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 15l6-6 6 6" />
  </svg>
);

const TrashIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </svg>
);

export default function PacketDock() {
  const dockOpen = useStore((s) => s.dockOpen);
  const setDockOpen = useStore((s) => s.setDockOpen);
  const dockHeight = useStore((s) => s.dockHeight);
  const setDockHeight = useStore((s) => s.setDockHeight);
  const logs = useStore((s) => s.logs);
  const clearLogs = useStore((s) => s.clearLogs);

  if (!dockOpen) {
    return (
      <button
        onClick={() => setDockOpen(true)}
        className="flex h-7 shrink-0 items-center gap-2 border-t border-line-1 bg-surface-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-3 hover:bg-surface-2 hover:text-ink-1"
      >
        {ChevronUp}
        Packet Log
        <span className="font-mono text-ink-3 normal-case">{logs.length}</span>
      </button>
    );
  }

  return (
    <>
      <ResizeHandle
        axis="y"
        label="Resize packet log"
        onDelta={(_dx, dy) => setDockHeight(dockHeight - dy)}
        onKeyStep={(step) => setDockHeight(dockHeight - step)}
      />
      <section
        style={{ height: dockHeight }}
        className="flex min-h-0 shrink-0 flex-col border-t border-line-1 bg-surface-1"
        aria-label="Packet Log"
      >
        <header className="flex h-8 shrink-0 items-center gap-2 px-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-3">Packet Log</h2>
          <span className="font-mono text-[10px] text-ink-3">{logs.length}</span>
          <div className="ml-auto flex items-center gap-1">
            <TipButton label="Clear log" onClick={clearLogs} disabled={logs.length === 0}>
              {TrashIcon}
            </TipButton>
            <TipButton label="Collapse" onClick={() => setDockOpen(false)}>
              {ChevronDown}
            </TipButton>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          <PacketLog />
        </div>
      </section>
    </>
  );
}
