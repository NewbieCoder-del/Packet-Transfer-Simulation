import { useState } from 'react';
import { useStore } from '../../store';
import { useSimulation } from '../../hooks/use-simulation';
import { SCENARIOS, createPingScenario, createHttpScenario, createDnsScenario } from '../../engine/scenarios';
import type { ScenarioType } from '../../engine/scenarios';
import { loadTopology } from '../../utils/storage';

const PlayIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 2.5l9 5.5-9 5.5z" />
  </svg>
);
const PauseIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
    <rect x="3.5" y="2.5" width="3.5" height="11" rx="1" />
    <rect x="9" y="2.5" width="3.5" height="11" rx="1" />
  </svg>
);
const StepIcon = (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3 2.5l7 5.5-7 5.5z" />
    <rect x="11" y="2.5" width="2.5" height="11" rx="1" />
  </svg>
);
const ResetIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10a8 8 0 1 1 1.2 6.9" />
    <path d="M4 4v6h6" />
  </svg>
);

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-3">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

const Divider = () => <div className="h-5 w-px bg-line-1" />;

export default function SimulationToolbar() {
  const nodes = useStore((s) => s.nodes);
  const simState = useStore((s) => s.simState);
  const speed = useStore((s) => s.speed);
  const setSpeed = useStore((s) => s.setSpeed);
  const enqueueEvent = useStore((s) => s.enqueueEvent);
  const eventQueue = useStore((s) => s.eventQueue);

  const { start, pause, resume, stepOnce, reset } = useSimulation();
  const [flash, setFlash] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(() => Boolean(loadTopology()));

  const notify = (message: string) => {
    setFlash(message);
    window.setTimeout(() => setFlash((current) => (current === message ? null : current)), 2200);
  };

  const launchScenario = (scenarioId: ScenarioType) => {
    const hosts = nodes.filter((n) => n.type === 'host');
    const webServers = nodes.filter((n) => n.type === 'web-server');
    const dnsServers = nodes.filter((n) => n.type === 'dns-server');

    let events: ReturnType<typeof createPingScenario> = [];

    if (scenarioId === 'ping') {
      if (hosts.length < 2) {
        const src = hosts[0];
        const dst = nodes.find((n) => n.id !== src?.id && n.type !== 'switch');
        if (src && dst) events = createPingScenario(src, dst);
      } else {
        events = createPingScenario(hosts[0], hosts[1]);
      }
    } else if (scenarioId === 'http-request') {
      const src = hosts[0];
      const dst = webServers[0];
      if (src && dst) events = createHttpScenario(src, dst);
    } else if (scenarioId === 'dns-lookup') {
      const src = hosts[0];
      const dns = dnsServers[0];
      if (src && dns) events = createDnsScenario(src, dns);
    }

    if (events.length === 0) {
      notify("This scenario needs the matching devices");
      return;
    }

    reset();
    for (const event of events) enqueueEvent(event);
    start();
  };

  const canRun = eventQueue.length > 0 || nodes.length >= 2;

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 overflow-x-auto border-b border-line-1 bg-surface-1 px-3">
      <Group label={"Scenario"}>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => launchScenario(s.id)}
            disabled={!canRun}
            title={s.description}
            className="rounded-sm border border-line-1 bg-surface-2 px-2.5 py-1.5 text-[11px] font-medium text-ink-1
                       transition-colors hover:border-line-2 hover:bg-surface-3
                       disabled:cursor-not-allowed disabled:opacity-35"
          >
            {s.label}
          </button>
        ))}
      </Group>

      <Divider />

      <Group label={"Simulation"}>
        {simState === 'running' || simState === 'stepping' ? (
          <button
            onClick={pause}
            className="flex items-center gap-1.5 rounded-sm border border-warn/40 bg-warn/15 px-2.5 py-1.5 text-[11px] font-semibold text-warn hover:bg-warn/25"
          >
            {PauseIcon}
            {"Pause"}
          </button>
        ) : (
          <button
            onClick={simState === 'paused' ? resume : start}
            disabled={eventQueue.length === 0}
            className="flex items-center gap-1.5 rounded-sm border border-ok/40 bg-ok/15 px-2.5 py-1.5 text-[11px] font-semibold text-ok
                       hover:bg-ok/25 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {PlayIcon}
            {"Run"}
          </button>
        )}
        <button
          onClick={stepOnce}
          disabled={eventQueue.length === 0}
          title={"Step"}
          className="flex items-center gap-1.5 rounded-sm border border-line-1 bg-surface-2 px-2.5 py-1.5 text-[11px] text-ink-1 hover:bg-surface-3 disabled:opacity-35"
        >
          {StepIcon}
          {"Step"}
        </button>
        <button
          onClick={reset}
          title={"Reset"}
          className="flex items-center gap-1.5 rounded-sm border border-line-1 bg-surface-2 px-2.5 py-1.5 text-[11px] text-ink-1 hover:bg-surface-3"
        >
          {ResetIcon}
          {"Reset"}
        </button>
      </Group>

      <Divider />

      <div className="flex items-center gap-1 rounded-sm border border-line-1 bg-surface-2 p-0.5">
        {[0.5, 1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            aria-pressed={speed === s}
            className={`rounded-xs px-2 py-1 font-mono text-[10px] transition-colors ${
              speed === s ? 'bg-accent text-accent-ink' : 'text-ink-3 hover:text-ink-1'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <Divider />

      <Group label={"Topology"}>
        <button
          onClick={() => {
            useStore.getState().saveToStorage();
            setHasSaved(true);
            notify("Topology saved");
          }}
          disabled={nodes.length === 0}
          className="rounded-sm border border-line-1 bg-surface-2 px-2.5 py-1.5 text-[11px] text-ink-1 hover:bg-surface-3 disabled:opacity-35"
        >
          {"Save"}
        </button>
        <button
          onClick={() => {
            const loaded = useStore.getState().loadFromStorage();
            notify(loaded ? "Topology loaded" : "No saved topology found");
          }}
          disabled={!hasSaved}
          className="rounded-sm border border-line-1 bg-surface-2 px-2.5 py-1.5 text-[11px] text-ink-1 hover:bg-surface-3 disabled:opacity-35"
        >
          {"Load"}
        </button>
      </Group>

      {eventQueue.length > 0 && (
        <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-3">
          {`${eventQueue.length} events queued`}
        </span>
      )}

      {flash && (
        <span
          role="status"
          className={`${eventQueue.length > 0 ? '' : 'ml-auto '}shrink-0 rounded-sm border border-accent/35 bg-accent/10 px-2 py-1 text-[10px] text-ink-1`}
        >
          {flash}
        </span>
      )}
    </div>
  );
}
