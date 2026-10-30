import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';

const TAG_COLOR: Record<string, string> = {
  ARP: 'var(--proto-arp)',
  ICMP: 'var(--proto-icmp)',
  TCP: 'var(--proto-tcp)',
  DNS: 'var(--proto-dns)',
  HTTP: 'var(--proto-http)',
};

const FILTERS = ['ALL', 'ARP', 'ICMP', 'TCP', 'DNS', 'HTTP'] as const;
type Filter = (typeof FILTERS)[number];

function parseTag(message: string): { tag: string; text: string } {
  const match = /^\[([A-Z]+)\]\s*(.*)$/.exec(message);
  if (!match) return { tag: 'SIM', text: message };
  return { tag: match[1], text: match[2] };
}

export default function PacketLog() {
  const logs = useStore((s) => s.logs);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const visible = logs
      .map((log) => ({ ...log, ...parseTag(log.message) }))
      .filter((row) => filter === 'ALL' || row.tag === filter);
    return visible.slice(-300);
  }, [logs, filter]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [rows.length, autoScroll]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 px-3 pb-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-xs border px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
              filter === f
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-line-1 bg-surface-2 text-ink-3 hover:text-ink-1'
            }`}
          >
            {f === 'ALL' ? "All" : f}
          </button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[10px] text-ink-3 hover:text-ink-1">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="h-3 w-3 accent-[var(--accent)]"
          />
          {"Auto-scroll"}
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="px-3 py-2 text-[11px] text-ink-3">{"No events yet — run a scenario to generate traffic."}</p>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          <table className="w-full border-separate border-spacing-0">
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="align-baseline">
                  <td className="w-10 py-[3px] pr-2 text-right font-mono text-[10px] text-ink-3">
                    {row.time}
                  </td>
                  <td className="w-14 py-[3px] pr-2 font-mono text-[10px] font-bold">
                    <span style={{ color: TAG_COLOR[row.tag] ?? 'var(--ink-2)' }}>{row.tag}</span>
                  </td>
                  <td className="py-[3px] font-mono text-[11px] text-ink-1">{row.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
