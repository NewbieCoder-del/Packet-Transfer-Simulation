import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import type { LogEntry } from '../../store/log-slice';
import PacketInspector from './PacketInspector';

const TAG_COLOR: Record<string, string> = {
  ARP: 'var(--proto-arp)',
  ICMP: 'var(--proto-icmp)',
  TCP: 'var(--proto-tcp)',
  UDP: 'var(--proto-udp)',
  DNS: 'var(--proto-dns)',
  HTTP: 'var(--proto-http)',
  L2: 'var(--ink-3)',
  L3: 'var(--ink-3)',
  SWITCH: 'var(--ok)',
  ROUTE: 'var(--warn)',
  SIM: 'var(--ink-2)',
};

/** Lines about forwarding rather than a protocol still belong to one filter group. */
const FORWARDING_TAGS = new Set(['L2', 'L3', 'SWITCH', 'ROUTE']);

const FILTERS = ['ALL', 'ARP', 'ICMP', 'TCP', 'UDP', 'DNS', 'HTTP', 'FWD'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  ALL: 'All',
  ARP: 'ARP',
  ICMP: 'ICMP',
  TCP: 'TCP',
  UDP: 'UDP',
  DNS: 'DNS',
  HTTP: 'HTTP',
  FWD: 'Forwarding',
};

function parseTag(message: string): { tag: string; text: string } {
  const match = /^\[([A-Z0-9]+)\]\s*(.*)$/.exec(message);
  if (!match) return { tag: 'SIM', text: message };
  return { tag: match[1], text: match[2] };
}

function matchesFilter(tag: string, filter: Filter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'FWD') return FORWARDING_TAGS.has(tag);
  return tag === filter;
}

type Row = LogEntry & { tag: string; text: string };

export default function PacketLog() {
  const logs = useStore((s) => s.logs);
  const nodes = useStore((s) => s.nodes);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const rows = useMemo<Row[]>(
    () =>
      logs
        .map((log) => ({ ...log, ...parseTag(log.message) }))
        .filter((row) => matchesFilter(row.tag, filter))
        .slice(-300),
    [logs, filter]
  );

  const selected = rows.find((row) => row.id === selectedLogId && row.packet);
  const device = selected?.nodeId ? nodes.find((n) => n.id === selected.nodeId) : undefined;

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [rows.length, autoScroll]);

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
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
              {FILTER_LABEL[f]}
            </button>
          ))}
          <label className="ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 text-[10px] text-ink-3 hover:text-ink-1">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="h-3 w-3 accent-[var(--accent)]"
            />
            Auto-scroll
          </label>
        </div>

        {rows.length === 0 ? (
          <p className="px-3 py-2 text-[11px] text-ink-3">
            No events yet — run a scenario to generate traffic.
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
            <table className="w-full border-separate border-spacing-0">
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedLogId(row.packet ? row.id : null)}
                    aria-selected={selected?.id === row.id}
                    className={`align-baseline ${
                      row.packet ? 'cursor-pointer hover:bg-surface-3' : ''
                    } ${selected?.id === row.id ? 'bg-accent/10' : ''}`}
                  >
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

      {selected?.packet && (
        <PacketInspector
          packet={selected.packet}
          onClose={() => setSelectedLogId(null)}
          deviceLabel={device?.label}
        />
      )}
    </div>
  );
}
