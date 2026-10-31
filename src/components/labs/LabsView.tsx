import type { ComponentType } from 'react';
import { LABS } from '../../labs/registry';
import type { LabId } from '../../labs/types';
import { useStore } from '../../store';
import OsiLab from './OsiLab';
import CrcLab from './CrcLab';
import HammingLab from './HammingLab';
import ArqLab from './ArqLab';
import MacLab from './MacLab';
import TcpCongestionLab from './TcpCongestionLab';

const LAB_VIEWS: Record<LabId, ComponentType> = {
  osi: OsiLab,
  crc: CrcLab,
  hamming: HammingLab,
  arq: ArqLab,
  mac: MacLab,
  'tcp-congestion': TcpCongestionLab,
};

export default function LabsView() {
  const activeLabId = useStore((state) => state.activeLabId);
  const setActiveLabId = useStore((state) => state.setActiveLabId);
  const ActiveLab = LAB_VIEWS[activeLabId];

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-line-1 bg-surface-1">
        <header className="flex h-9 shrink-0 items-center border-b border-line-1 px-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-3">Networking Labs</h2>
        </header>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
          {LABS.map((lab) => {
            const active = lab.id === activeLabId;
            return (
              <button
                key={lab.id}
                onClick={() => setActiveLabId(lab.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-start gap-0.5 rounded-sm border px-2 py-1.5 text-left transition-colors ${
                  active
                    ? 'border-accent/60 bg-accent/15'
                    : 'border-transparent hover:border-line-1 hover:bg-surface-2'
                }`}
              >
                <span className={`text-[11px] font-semibold ${active ? 'text-ink-1' : 'text-ink-2'}`}>
                  {lab.title}
                </span>
                <span className="text-[10px] text-ink-3">{lab.topic}</span>
              </button>
            );
          })}
        </nav>
        <p className="border-t border-line-1 px-3 py-2 text-[10px] leading-snug text-ink-3">
          Every lab runs the real algorithm on your inputs. Configure it, then Start, Step or Reset to inspect each
          decision.
        </p>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <ActiveLab key={activeLabId} />
      </main>
    </div>
  );
}
