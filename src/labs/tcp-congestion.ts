import type { LabStep } from './types';
import { clamp } from './prng';

export interface TcpCongestionConfig {
  initialCwnd: number;
  initialSsthresh: number;
  rounds: number;
  /** Round in which three duplicate ACKs signal a lost segment (0 = no loss). */
  lossRound: number;
  /** Round in which the retransmission timer expires (0 = no timeout). */
  timeoutRound: number;
}

export interface TcpRound {
  round: number;
  cwnd: number;
  ssthresh: number;
  phase: 'slow-start' | 'congestion-avoidance';
  event: 'triple-duplicate-ack' | 'timeout' | null;
  nextCwnd: number;
}

export interface TcpResult {
  rounds: TcpRound[];
  steps: LabStep[];
  peakCwnd: number;
  averageCwnd: number;
}

export function simulateTcpCongestion(raw: TcpCongestionConfig): TcpResult {
  const cfg: TcpCongestionConfig = {
    initialCwnd: clamp(Math.round(raw.initialCwnd), 1, 64),
    initialSsthresh: clamp(Math.round(raw.initialSsthresh), 2, 128),
    rounds: clamp(Math.round(raw.rounds), 2, 40),
    lossRound: clamp(Math.round(raw.lossRound), 0, raw.rounds),
    timeoutRound: clamp(Math.round(raw.timeoutRound), 0, raw.rounds),
  };

  let cwnd = cfg.initialCwnd;
  let ssthresh = cfg.initialSsthresh;
  const rounds: TcpRound[] = [];
  const steps: LabStep[] = [];

  steps.push({
    title: 'Before the first RTT',
    badge: `cwnd ${cwnd} MSS`,
    detail: [
      `The connection starts with a congestion window of ${cwnd} MSS and a slow-start threshold of ${ssthresh} MSS.`,
      'Slow start does not mean "slow": cwnd doubles every RTT until it reaches ssthresh.',
      'After ssthresh, congestion avoidance grows cwnd by roughly one MSS per RTT.',
    ],
  });

  for (let round = 1; round <= cfg.rounds; round++) {
    const phase: TcpRound['phase'] = cwnd < ssthresh ? 'slow-start' : 'congestion-avoidance';
    let event: TcpRound['event'] = null;
    if (round === cfg.timeoutRound) event = 'timeout';
    else if (round === cfg.lossRound) event = 'triple-duplicate-ack';

    const before = cwnd;
    const thresholdNow = ssthresh;
    let nextCwnd: number;
    let explanation: string;

    if (event === 'timeout') {
      ssthresh = Math.max(Math.floor(cwnd / 2), 2);
      nextCwnd = 1;
      explanation = `The retransmission timer expires: ssthresh becomes cwnd/2 = ${ssthresh} MSS and cwnd collapses to 1 MSS. The next round restarts in slow start.`;
    } else if (event === 'triple-duplicate-ack') {
      ssthresh = Math.max(Math.floor(cwnd / 2), 2);
      nextCwnd = ssthresh;
      explanation = `Three duplicate ACKs signal one lost segment: ssthresh becomes cwnd/2 = ${ssthresh} MSS. Fast recovery sets cwnd = ssthresh, so the connection continues in congestion avoidance instead of restarting.`;
    } else if (phase === 'slow-start') {
      nextCwnd = Math.min(cwnd * 2, Math.max(ssthresh, cwnd));
      explanation = `cwnd ${cwnd} < ssthresh ${thresholdNow}, so the window doubles to ${nextCwnd} MSS.`;
    } else {
      nextCwnd = cwnd + 1;
      explanation = `cwnd ${cwnd} >= ssthresh ${thresholdNow}: congestion avoidance adds one MSS per RTT, so cwnd becomes ${nextCwnd} MSS.`;
    }

    rounds.push({ round, cwnd: before, ssthresh: thresholdNow, phase, event, nextCwnd });

    steps.push({
      title: `RTT ${round}`,
      badge: `${phase === 'slow-start' ? 'slow start' : 'congestion avoidance'}`,
      detail: [
        explanation,
        event ? `Threshold for the next round: ${ssthresh} MSS.` : `ssthresh stays at ${ssthresh} MSS.`,
        `Data in flight at the start of the round: ${before} MSS.`,
      ],
    });

    cwnd = nextCwnd;
  }

  const peakCwnd = Math.max(...rounds.map((r) => r.cwnd));
  const averageCwnd = rounds.reduce((sum, r) => sum + r.cwnd, 0) / rounds.length;
  const sawSlowStart = rounds.some((r) => r.phase === 'slow-start');

  steps.push({
    title: 'Result',
    badge: `peak ${peakCwnd} MSS`,
    detail: [
      `Peak congestion window ${peakCwnd} MSS, average ${averageCwnd.toFixed(1)} MSS over ${rounds.length} round${rounds.length === 1 ? '' : 's'}.`,
      sawSlowStart
        ? 'The window grows exponentially while below ssthresh and linearly above it - the same sawtooth shape you see on a bandwidth graph.'
        : 'No slow-start phase in this window range: the connection began at or above ssthresh.',
      cfg.lossRound > 0 || cfg.timeoutRound > 0
        ? 'Loss halves ssthresh each time; a timeout also empties the window back to one MSS, which is why recovery after a timeout costs many RTTs.'
        : 'No loss was simulated, so the window only ever grows.',
    ],
    table: {
      columns: ['RTT', 'cwnd (MSS)', 'ssthresh (MSS)', 'Phase', 'Event'],
      rows: rounds.map((r) => [
        `${r.round}`,
        `${r.cwnd}`,
        `${r.ssthresh}`,
        r.phase === 'slow-start' ? 'slow start' : 'congestion avoidance',
        r.event === 'timeout' ? 'timeout' : r.event ? '3 dup ACKs' : '-',
      ]),
    },
  });

  return { rounds, steps, peakCwnd, averageCwnd };
}
