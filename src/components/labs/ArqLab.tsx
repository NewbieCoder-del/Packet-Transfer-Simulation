import { useMemo, useState } from 'react';
import { ARQ_MODES, effectiveWindow, simulateArq, type ArqConfig } from '../../labs/arq';
import { getLab } from '../../labs/registry';
import LabFrame, { Field, NumberField, labInputClass } from './LabFrame';
import { Badge, Card } from '../common/ui';

function stateTone(state: string): 'ok' | 'accent' | 'neutral' | 'warn' {
  if (state === 'delivered') return 'ok';
  if (state.startsWith('in flight')) return 'accent';
  if (state.startsWith('not sent')) return 'neutral';
  return 'warn';
}

export default function ArqLab() {
  const lab = getLab('arq');
  const [mode, setMode] = useState<ArqConfig['mode']>('go-back-n');
  const [frames, setFrames] = useState(8);
  const [window, setWindow] = useState(4);
  const [lossPercent, setLossPercent] = useState(20);
  const [timeout, setTimeoutSlots] = useState(4);
  const [seed, setSeed] = useState(7);

  const config = useMemo<ArqConfig>(
    () => ({ mode, frames, window, lossRate: lossPercent / 100, timeout, seed }),
    [mode, frames, window, lossPercent, timeout, seed]
  );
  const result = useMemo(() => simulateArq(config), [config]);
  const runWindow = effectiveWindow(config);

  return (
    <LabFrame
      lab={lab}
      steps={result.steps}
      configKey={JSON.stringify(config)}
      config={
        <>
          <Field label="Protocol">
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as ArqConfig['mode'])}
              className={labInputClass}
            >
              {ARQ_MODES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Frames" value={frames} min={1} max={16} onChange={setFrames} />
            <NumberField
              label="Window"
              value={window}
              min={1}
              max={8}
              onChange={setWindow}
              hint={mode === 'stop-and-wait' ? 'Fixed at 1' : undefined}
            />
          </div>
          <NumberField label="Loss rate (%)" value={lossPercent} min={0} max={90} onChange={setLossPercent} />
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Timeout (slots)" value={timeout} min={2} max={12} onChange={setTimeoutSlots} />
            <NumberField label="Random seed" value={seed} min={1} max={99999} onChange={setSeed} />
          </div>
        </>
      }
      renderVisual={(index) => {
        const current = result.steps[index];
        const table = result.steps.slice(0, index + 1).reverse().find((step) => step.table)?.table;
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-ink-1">
                {ARQ_MODES.find((entry) => entry.id === mode)?.label} · window {runWindow} · {frames} frames
              </span>
              <div className="flex items-center gap-1.5">
                <Badge tone="accent">{current?.badge ?? 'idle'}</Badge>
                {mode === 'stop-and-wait' && <Badge tone="neutral">one frame in flight</Badge>}
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-[10px] text-ink-3">
                <span>Frames at this instant</span>
                <span className="font-mono">{lossPercent}% loss · timeout {timeout} slots</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(table?.rows ?? []).map((row) => (
                  <div
                    key={row[0]}
                    className="flex w-20 flex-col items-center gap-1 rounded-sm border border-line-1 bg-surface-2 px-1.5 py-1"
                  >
                    <span className="font-mono text-[11px] text-ink-1">#{row[0]}</span>
                    <Badge tone={stateTone(row[1])}>{row[1].startsWith('in flight') ? 'in flight' : row[1]}</Badge>
                    <span className="font-mono text-[9px] text-ink-3">sent {row[2]}</span>
                  </div>
                ))}
              </div>
            </div>

            {index === result.steps.length - 1 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Transmissions', result.transmissions],
                  ['Retransmissions', result.retransmissions],
                  ['Delivered', `${result.delivered} / ${frames}`],
                  ['Peak in flight', result.maxOutstanding],
                ].map(([label, value]) => (
                  <Card key={label} className="bg-surface-2 px-2 py-1.5">
                    <div className="text-[9px] uppercase tracking-wide text-ink-3">{label}</div>
                    <div className="font-mono text-sm text-ink-1">{value}</div>
                  </Card>
                ))}
              </div>
            )}

            <p className="text-[10px] leading-snug text-ink-3">
              Green: acknowledged, blue: sent but unacknowledged, grey: not sent yet. Frames and ACKs each spend one
              slot on the channel; the sender retransmits when an ACK does not arrive within the timeout.
            </p>
          </div>
        );
      }}
    />
  );
}
