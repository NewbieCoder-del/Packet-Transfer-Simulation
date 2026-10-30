import { useStore } from '../../store';

const STATE_LABEL: Record<string, string> = {
  idle: 'Idle',
  running: 'Running',
  paused: 'Paused',
  stepping: 'Stepping',
};

export default function StatusBar() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const eventQueue = useStore((s) => s.eventQueue);
  const activePackets = useStore((s) => s.activePackets);
  const simState = useStore((s) => s.simState);
  const simTime = useStore((s) => s.simTime);
  const speed = useStore((s) => s.speed);
  const zoom = useStore((s) => s.canvasZoom);

  const linksDown = edges.filter((e) => e.status === 'down').length;

  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-line-1 bg-surface-1 px-3 text-[11px] text-ink-3">
      <span className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            simState === 'running'
              ? 'bg-ok nlab-live'
              : simState === 'paused' || simState === 'stepping'
                ? 'bg-warn'
                : 'bg-ink-3'
          }`}
        />
        <span className="uppercase tracking-wide text-ink-2">{STATE_LABEL[simState]}</span>
      </span>

      <span className="hidden md:inline">
        Tick <span className="font-mono text-ink-2">{simTime}</span>
      </span>
      <span className="hidden md:inline">
        Speed <span className="font-mono text-ink-2">{speed}x</span>
      </span>

      <span className="ml-auto flex items-center gap-4">
        <span>
          Devices <span className="font-mono text-ink-2">{nodes.length}</span>
        </span>
        <span>
          Links{' '}
          <span className="font-mono text-ink-2">
            {edges.length}
            {linksDown > 0 && <span className="text-bad"> ({linksDown} down)</span>}
          </span>
        </span>
        <span>
          Packets / Queue{' '}
          <span className="font-mono text-ink-2">
            {activePackets.length} / {eventQueue.length}
          </span>
        </span>
        <span>
          Zoom <span className="font-mono text-ink-2">{Math.round(zoom * 100)}%</span>
        </span>
      </span>
    </footer>
  );
}
