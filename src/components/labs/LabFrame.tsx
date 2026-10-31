import { useEffect, useRef, type ReactNode } from 'react';
import type { LabDefinition, LabStep } from '../../labs/types';
import { useLabPlayer } from '../../labs/use-lab-player';
import { Badge, Button, Card, SectionTitle } from '../common/ui';

export const labInputClass =
  'w-full rounded-sm border border-line-1 bg-surface-2 px-2 py-1 font-mono text-[11px] text-ink-1 ' +
  'hover:border-line-2 focus:border-accent focus:outline-none disabled:opacity-40';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.08em] text-ink-3">{label}</span>
      {children}
      {hint && <span className="text-[10px] leading-snug text-ink-3">{hint}</span>}
    </label>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className={labInputClass}
      />
    </Field>
  );
}

export function StepTable({ table }: { table: NonNullable<LabStep['table']> }) {
  return (
    <div className="mt-2 overflow-x-auto rounded-sm border border-line-1">
      <table className="w-full border-collapse font-mono text-[10px]">
        <thead className="bg-surface-3 text-ink-3">
          <tr>
            {table.columns.map((column) => (
              <th key={column} className="whitespace-nowrap px-2 py-1 text-left font-semibold uppercase tracking-wide">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-1">
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="text-ink-2">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="whitespace-nowrap px-2 py-1">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepCard({ step, current }: { step: LabStep; current: boolean }) {
  return (
    <Card className={`px-3 py-2.5 ${current ? 'border-accent/60 bg-surface-3' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-semibold text-ink-1">{step.title}</h4>
        {step.badge && <Badge tone={current ? 'accent' : 'neutral'}>{step.badge}</Badge>}
      </div>
      <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-[11px] leading-relaxed text-ink-2">
        {step.detail.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
      {step.table && <StepTable table={step.table} />}
    </Card>
  );
}

export default function LabFrame({
  lab,
  steps,
  error,
  configKey,
  config,
  renderVisual,
}: {
  lab: LabDefinition;
  steps: LabStep[];
  error?: string;
  configKey: string;
  config: ReactNode;
  renderVisual: (index: number) => ReactNode;
}) {
  const player = useLabPlayer(steps.length, configKey);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    stepRefs.current[player.index]?.scrollIntoView({ block: 'nearest' });
  }, [player.index]);

  const disabled = steps.length === 0;
  const progress = steps.length > 0 ? ((player.index + 1) / steps.length) * 100 : 0;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-[280px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-line-1 bg-surface-1 p-3">
        <div>
          <Badge tone="accent">{lab.topic}</Badge>
          <h2 className="mt-1.5 text-sm font-semibold text-ink-1">{lab.title}</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-3">{lab.summary}</p>
        </div>

        <div>
          <SectionTitle>Configuration</SectionTitle>
          <div className="flex flex-col gap-2.5 rounded-md border border-line-1 bg-surface-2 p-2.5">{config}</div>
        </div>

        <div>
          <SectionTitle
            right={
              <span className="font-mono text-[10px] text-ink-3">
                {steps.length === 0 ? '—' : `${player.index + 1} / ${steps.length}`}
              </span>
            }
          >
            Playback
          </SectionTitle>
          <div className="rounded-md border border-line-1 bg-surface-2 p-2.5">
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex gap-1.5">
              <Button variant="primary" block disabled={disabled || steps.length < 2} onClick={player.start}>
                {player.playing ? 'Pause' : 'Start'}
              </Button>
              <Button block disabled={disabled || player.atEnd} onClick={player.step}>
                Step
              </Button>
              <Button block disabled={disabled} onClick={player.reset}>
                Reset
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-ink-3">
              Start plays every step; Step advances one step; Reset returns to the first step.
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-bad/35 bg-bad/10 px-2.5 py-2 text-[11px] leading-snug text-bad">
            {error}
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto bg-surface-0 p-3">
        <Card className="shrink-0 bg-surface-1 px-3 py-3">{renderVisual(player.index)}</Card>

        <div className="flex flex-col gap-2">
          {steps.length === 0 ? (
            <p className="rounded-md border border-dashed border-line-1 px-3 py-6 text-center text-[11px] text-ink-3">
              Fix the configuration to build a run.
            </p>
          ) : (
            steps.slice(0, player.index + 1).map((step, index) => (
              <div key={index} ref={(element) => { stepRefs.current[index] = element; }}>
                <StepCard step={step} current={index === player.index} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
