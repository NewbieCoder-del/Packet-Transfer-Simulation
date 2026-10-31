import { useMemo, useState } from 'react';
import { simulateTcpCongestion, type TcpCongestionConfig } from '../../labs/tcp-congestion';
import { getLab } from '../../labs/registry';
import LabFrame, { NumberField } from './LabFrame';
import { Badge, Card } from '../common/ui';

const WIDTH = 640;
const HEIGHT = 210;
const PAD_L = 36;
const PAD_R = 16;
const PAD_T = 14;
const PAD_B = 28;

export default function TcpCongestionLab() {
  const lab = getLab('tcp-congestion');
  const [initialCwnd, setInitialCwnd] = useState(1);
  const [initialSsthresh, setInitialSsthresh] = useState(8);
  const [rounds, setRounds] = useState(10);
  const [lossRound, setLossRound] = useState(6);
  const [timeoutRound, setTimeoutRound] = useState(9);

  const config = useMemo<TcpCongestionConfig>(
    () => ({ initialCwnd, initialSsthresh, rounds, lossRound, timeoutRound }),
    [initialCwnd, initialSsthresh, rounds, lossRound, timeoutRound]
  );
  const result = useMemo(() => simulateTcpCongestion(config), [config]);

  return (
    <LabFrame
      lab={lab}
      steps={result.steps}
      configKey={JSON.stringify(config)}
      config={
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Initial cwnd" value={initialCwnd} min={1} max={64} onChange={setInitialCwnd} hint="MSS" />
            <NumberField
              label="Initial ssthresh"
              value={initialSsthresh}
              min={2}
              max={128}
              onChange={setInitialSsthresh}
              hint="MSS"
            />
          </div>
          <NumberField label="Rounds (RTTs)" value={rounds} min={2} max={40} onChange={setRounds} />
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="3 dup ACKs at"
              value={lossRound}
              min={0}
              max={rounds}
              onChange={setLossRound}
              hint="0 = none"
            />
            <NumberField
              label="Timeout at"
              value={timeoutRound}
              min={0}
              max={rounds}
              onChange={setTimeoutRound}
              hint="0 = none"
            />
          </div>
        </>
      }
      renderVisual={(index) => {
        const samples = result.rounds.slice(0, index);
        const all = result.rounds;
        const maxY = Math.max(...all.map((round) => Math.max(round.cwnd, round.ssthresh)), 2) + 1;
        const x = (i: number) => PAD_L + (i * (WIDTH - PAD_L - PAD_R)) / Math.max(all.length - 1, 1);
        const y = (value: number) => HEIGHT - PAD_B - (value * (HEIGHT - PAD_T - PAD_B)) / maxY;
        const line = samples.map((round, i) => `${x(i)},${y(round.cwnd)}`).join(' ');
        const threshold = samples.map((round, i) => `${x(i)},${y(round.ssthresh)}`).join(' ');
        const ticks = [0, Math.round(maxY / 2), maxY];
        const atEnd = index === result.steps.length - 1;

        return (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-ink-1">Congestion window over time</span>
              <div className="flex items-center gap-1.5">
                <Badge tone="accent">{result.steps[index]?.badge ?? 'idle'}</Badge>
                {samples.length > 0 && (
                  <Badge tone="neutral">
                    {samples[samples.length - 1].phase === 'slow-start' ? 'slow start' : 'congestion avoidance'}
                  </Badge>
                )}
              </div>
            </div>

            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="cwnd versus RTT chart">
              {ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={PAD_L}
                    x2={WIDTH - PAD_R}
                    y1={y(tick)}
                    y2={y(tick)}
                    stroke="var(--line-1)"
                    strokeWidth="1"
                  />
                  <text x={PAD_L - 6} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="var(--ink-3)">
                    {tick}
                  </text>
                </g>
              ))}

              {all.map((round, i) => (
                <text key={round.round} x={x(i)} y={HEIGHT - 10} textAnchor="middle" fontSize="9" fill="var(--ink-3)">
                  {round.round}
                </text>
              ))}

              {samples.length > 1 && (
                <polyline points={threshold} fill="none" stroke="var(--warn)" strokeWidth="1.4" strokeDasharray="4 3" />
              )}
              {samples.length > 0 && (
                <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
              )}

              {samples.map((round, i) => (
                <g key={round.round}>
                  {round.event && (
                    <circle cx={x(i)} cy={y(round.cwnd)} r="4.5" fill="var(--bad)" stroke="var(--surface-1)" strokeWidth="1.5" />
                  )}
                  <circle cx={x(i)} cy={y(round.cwnd)} r="2.6" fill="var(--accent)" />
                </g>
              ))}

              {samples.length === 0 && (
                <text x={WIDTH / 2} y={HEIGHT / 2} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
                  Press Step to reveal RTT 1
                </text>
              )}
            </svg>

            <div className="flex flex-wrap gap-3 text-[10px] text-ink-3">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 bg-accent" /> cwnd
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 border-t border-dashed border-warn" /> ssthresh
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-bad" /> loss event
              </span>
              <span className="ml-auto font-mono">MSS on the y axis · RTT on the x axis</span>
            </div>

            {atEnd && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Peak cwnd', `${result.peakCwnd} MSS`],
                  ['Average cwnd', `${result.averageCwnd.toFixed(1)} MSS`],
                  ['Rounds', `${result.rounds.length}`],
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
