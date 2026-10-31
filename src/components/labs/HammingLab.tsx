import { useMemo, useState } from 'react';
import { buildHammingSteps } from '../../labs/hamming';
import { getLab } from '../../labs/registry';
import LabFrame, { Field, labInputClass } from './LabFrame';
import { Badge } from '../common/ui';

const isPowerOfTwo = (value: number) => value > 0 && (value & (value - 1)) === 0;

export default function HammingLab() {
  const lab = getLab('hamming');
  const [data, setData] = useState('1011');
  const [flipChoice, setFlipChoice] = useState(0);

  const clean = useMemo(() => buildHammingSteps(data, 0), [data]);
  const flipPosition = flipChoice > 0 && flipChoice <= clean.codeword.length ? flipChoice : 0;
  const result = useMemo(() => buildHammingSteps(data, flipPosition), [data, flipPosition]);
  const n = result.codeword.length;

  return (
    <LabFrame
      lab={lab}
      steps={result.steps}
      error={result.error}
      configKey={`${data}|${flipPosition}`}
      config={
        <>
          <Field label="Data bits" hint="Binary string; up to 16 bits">
            <input value={data} onChange={(event) => setData(event.target.value)} className={labInputClass} />
          </Field>
          <Field label="Corrupt one bit in transit">
            <select
              value={flipPosition}
              onChange={(event) => setFlipChoice(Number(event.target.value))}
              className={labInputClass}
            >
              <option value={0}>No error - codeword arrives intact</option>
              {Array.from({ length: n }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Flip position {i + 1} {isPowerOfTwo(i + 1) ? '(parity bit)' : '(data bit)'}
                </option>
              ))}
            </select>
          </Field>
        </>
      }
      renderVisual={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-ink-1">
              Hamming({n},{result.dataBits.length}) codeword
            </span>
            <div className="flex items-center gap-1.5">
              <Badge tone={result.syndrome === 0 ? 'ok' : 'bad'}>syndrome {result.syndrome}</Badge>
              <Badge tone={result.correctedAny ? 'warn' : 'neutral'}>
                {result.syndrome === 0 ? 'no error detected' : `error at position ${result.syndrome}`}
              </Badge>
            </div>
          </div>

          {n > 0 && (
            <>
              <div>
                <div className="mb-1 text-[10px] text-ink-3">Codeword as sent (position 1 is the leftmost bit)</div>
                <div className="flex flex-wrap gap-1">
                  {result.codeword.split('').map((bit, index) => {
                    const position = index + 1;
                    const parity = isPowerOfTwo(position);
                    return (
                      <div
                        key={position}
                        className={`flex w-9 flex-col items-center rounded-xs border ${
                          parity ? 'border-warn/45 bg-warn/10' : 'border-line-1 bg-surface-2'
                        }`}
                      >
                        <span className="pt-0.5 font-mono text-[9px] text-ink-3">{position}</span>
                        <span className="font-mono text-sm text-ink-1">{bit}</span>
                        <span className={`pb-0.5 text-[8px] uppercase ${parity ? 'text-warn' : 'text-ink-3'}`}>
                          {parity ? 'p' : 'd'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-[10px] text-ink-3">
                  <span>Codeword as received</span>
                  <span className="font-mono">corrected to {result.corrected}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.received.split('').map((bit, index) => {
                    const corrupted = index + 1 === flipPosition;
                    return (
                      <div
                        key={index}
                        className={`flex w-9 flex-col items-center rounded-xs border ${
                          corrupted ? 'border-bad bg-bad/20' : 'border-line-1 bg-surface-2'
                        }`}
                      >
                        <span className="pt-0.5 font-mono text-[9px] text-ink-3">{index + 1}</span>
                        <span className={`font-mono text-sm ${corrupted ? 'text-bad' : 'text-ink-1'}`}>{bit}</span>
                        <span className="pb-0.5 text-[8px] uppercase text-ink-3">
                          {isPowerOfTwo(index + 1) ? 'p' : 'd'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="font-mono text-[11px] text-ink-2">
                syndrome {result.syndrome} → flip position {result.syndrome || 'none'} → data {result.dataBits}
              </p>
            </>
          )}
        </div>
      )}
    />
  );
}
