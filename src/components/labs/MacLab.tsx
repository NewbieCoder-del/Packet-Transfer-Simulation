import { useMemo, useState } from 'react';
import { MAC_MODES, simulateMac, type MacConfig } from '../../labs/mac';
import { getLab } from '../../labs/registry';
import LabFrame, { Field, NumberField, labInputClass } from './LabFrame';
import { Badge, Card } from '../common/ui';

const BAND_COLORS: Record<string, string> = {
  delivered: 'bg-ok/75',
  collision: 'bg-bad/75',
  aborted: 'bg-warn/70',
};

export default function MacLab() {
  const lab = getLab('mac');
  const [mode, setMode] = useState<MacConfig['mode']>('slotted-aloha');
  const [stations, setStations] = useState(4);
  const [arrivalPercent, setArrivalPercent] = useState(45);
  const [frameSlots, setFrameSlots] = useState(2);
  const [slots, setSlots] = useState(20);
  const [seed, setSeed] = useState(9);

  const config = useMemo<MacConfig>(
    () => ({ mode, stations, arrivalRate: arrivalPercent / 100, frameSlots, slots, seed }),
    [mode, stations, arrivalPercent, frameSlots, slots, seed]
  );
  const result = useMemo(() => simulateMac(config), [config]);

  return (
    <LabFrame
      lab={lab}
      steps={result.steps}
      configKey={JSON.stringify(config)}
      config={
        <>
          <Field label="Access method">
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as MacConfig['mode'])}
              className={labInputClass}
            >
              {MAC_MODES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Stations" value={stations} min={1} max={8} onChange={setStations} />
            <NumberField label="Arrival (%)" value={arrivalPercent} min={0} max={100} onChange={setArrivalPercent} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Frame (slots)" value={frameSlots} min={1} max={6} onChange={setFrameSlots} />
            <NumberField label="Simulated slots" value={slots} min={5} max={40} onChange={setSlots} />
          </div>
          <NumberField label="Random seed" value={seed} min={1} max={99999} onChange={setSeed} />
        </>
      }
      renderVisual={(index) => {
        const slot = index < config.slots ? index : -1;
        const activeBands = result.bands.filter((band) => slot >= 0 && band.start <= slot && band.end > slot);
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-ink-1">
                {MAC_MODES.find((entry) => entry.id === mode)?.label} · {stations} station{stations === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-1.5">
                <Badge tone="accent">{result.steps[index]?.badge ?? 'idle'}</Badge>
                {slot >= 0 && <Badge tone="neutral">slot {slot}</Badge>}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {Array.from({ length: stations }, (_, station) => (
                <div key={station} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 font-mono text-[10px] text-ink-3">S{station}</span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded-xs border border-line-1 bg-surface-2">
                    {result.bands
                      .filter((band) => band.station === station)
                      .map((band, bandIndex) => (
                        <div
                          key={bandIndex}
                          title={`station ${station}: ${band.start.toFixed(2)} → ${band.end.toFixed(2)} (${band.outcome})`}
                          className={`absolute top-0.5 h-4 rounded-xs ${BAND_COLORS[band.outcome]}`}
                          style={{
                            left: `${(band.start / config.slots) * 100}%`,
                            width: `${Math.max(((band.end - band.start) / config.slots) * 100, 1)}%`,
                          }}
                        />
                      ))}
                    {slot >= 0 && (
                      <div
                        className="absolute top-0 h-full w-px bg-accent"
                        style={{ left: `${((slot + 0.5) / config.slots) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 text-[10px] text-ink-3">
              {[
                ['bg-ok/75', 'delivered'],
                ['bg-bad/75', 'collision'],
                ['bg-warn/70', 'aborted / jammed'],
                ['bg-accent', 'current slot'],
              ].map(([color, label]) => (
                <span key={label} className="inline-flex items-center gap-1">
                  <span className={`inline-block h-2.5 w-2.5 rounded-xs ${color}`} />
                  {label}
                </span>
              ))}
              <span className="ml-auto font-mono">{activeBands.length} active now</span>
            </div>

            {index === result.steps.length - 1 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  ['Delivered', `${result.delivered}`],
                  ['Collisions', `${result.collisions}`],
                  ['Deferred', `${result.deferred}`],
                  ['Offered load G', result.offeredLoad.toFixed(2)],
                  ['Throughput S', `${(result.throughput * 100).toFixed(1)}%`],
                  ['Theory S', result.theoretical === null ? 'n/a' : `${(result.theoretical * 100).toFixed(1)}%`],
                ].map(([label, value]) => (
                  <Card key={label} className="bg-surface-2 px-2 py-1.5">
                    <div className="text-[9px] uppercase tracking-wide text-ink-3">{label}</div>
                    <div className="font-mono text-sm text-ink-1">{value}</div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
