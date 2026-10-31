import { useMemo, useState } from 'react';
import { buildCrcSteps } from '../../labs/crc';
import { getLab } from '../../labs/registry';
import LabFrame, { Field, labInputClass } from './LabFrame';
import { Badge } from '../common/ui';

export default function CrcLab() {
  const lab = getLab('crc');
  const [data, setData] = useState('1101011011');
  const [generator, setGenerator] = useState('10011');
  const [flipChoice, setFlipChoice] = useState(-1);

  const clean = useMemo(() => buildCrcSteps({ data, generator, flipIndex: -1 }), [data, generator]);
  const flipIndex = flipChoice >= 0 && flipChoice < clean.transmitted.length ? flipChoice : -1;
  const result = useMemo(
    () => buildCrcSteps({ data, generator, flipIndex }),
    [data, generator, flipIndex]
  );
  const degree = Math.max(generator.trim().length - 1, 0);
  const fcsStart = result.transmitted.length - degree;
  const receivedBits = result.received.split('');

  return (
    <LabFrame
      lab={lab}
      steps={result.steps}
      error={result.error}
      configKey={`${data}|${generator}|${flipIndex}`}
      config={
        <>
          <Field label="Data bits D" hint="Binary string, e.g. 1101011011">
            <input value={data} onChange={(event) => setData(event.target.value)} className={labInputClass} />
          </Field>
          <Field label="Generator G" hint="Must start with 1; the CRC is as long as the generator minus one bit">
            <input value={generator} onChange={(event) => setGenerator(event.target.value)} className={labInputClass} />
          </Field>
          <Field label="Corrupt one bit in transit">
            <select
              value={flipIndex}
              onChange={(event) => setFlipChoice(Number(event.target.value))}
              className={labInputClass}
            >
              <option value={-1}>No error - clean frame</option>
              {clean.transmitted.split('').map((bit, index) => (
                <option key={index} value={index}>
                  Flip bit {index} ({bit})
                </option>
              ))}
            </select>
          </Field>
        </>
      }
      renderVisual={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-ink-2">
            <span>D = {data.trim()}</span>
            <span>G = {generator.trim()}</span>
            <span>R = {result.remainder || '—'}</span>
            <Badge tone={result.accepted ? 'ok' : result.received ? 'bad' : 'neutral'}>
              {result.received ? (result.accepted ? 'accepted' : 'error detected') : 'waiting'}
            </Badge>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[10px] text-ink-3">
              <span>Transmitted frame T = D + R</span>
              <span className="font-mono">receiver check remainder {result.checkRemainder || '—'}</span>
            </div>
            <div className="flex flex-wrap gap-1 rounded-sm border border-line-1 bg-surface-2 p-2">
              {receivedBits.map((bit, index) => {
                const isFcs = index >= fcsStart;
                const corrupted = index === flipIndex;
                return (
                  <span
                    key={index}
                    title={`bit ${index}${isFcs ? ' (FCS)' : ''}${corrupted ? ' - flipped' : ''}`}
                    className={`inline-flex h-6 w-5 items-center justify-center rounded-xs border font-mono text-[11px] ${
                      corrupted
                        ? 'border-bad bg-bad/25 text-bad'
                        : isFcs
                          ? 'border-warn/40 bg-warn/10 text-warn'
                          : 'border-line-1 bg-surface-1 text-ink-1'
                    }`}
                  >
                    {bit}
                  </span>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] text-ink-3">
              Orange bits are the frame check sequence; the red bit is the injected channel error.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="rounded-sm border border-line-1 bg-surface-2 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-wide text-ink-3">Remainder R</div>
              <div className="text-ink-1">{result.remainder || '—'}</div>
            </div>
            <div className="rounded-sm border border-line-1 bg-surface-2 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-wide text-ink-3">Frame T</div>
              <div className="truncate text-ink-1">{result.transmitted || '—'}</div>
            </div>
            <div className="rounded-sm border border-line-1 bg-surface-2 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-wide text-ink-3">Receiver remainder</div>
              <div className={result.accepted ? 'text-ok' : 'text-bad'}>{result.checkRemainder || '—'}</div>
            </div>
          </div>
        </div>
      )}
    />
  );
}
