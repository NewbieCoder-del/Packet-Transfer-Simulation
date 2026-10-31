import { describe, expect, it } from 'vitest';
import { simulateTcpCongestion, type TcpCongestionConfig } from './tcp-congestion';

const base: TcpCongestionConfig = {
  initialCwnd: 1,
  initialSsthresh: 8,
  rounds: 6,
  lossRound: 0,
  timeoutRound: 0,
};

const cwnds = (rounds: number, config: Partial<TcpCongestionConfig> = {}) =>
  simulateTcpCongestion({ ...base, rounds, ...config }).rounds.map((r) => r.cwnd);

describe('simulateTcpCongestion', () => {
  it('doubles through slow start then adds one per RTT', () => {
    expect(cwnds(6)).toEqual([1, 2, 4, 8, 9, 10]);
  });

  it('switches phase exactly at ssthresh', () => {
    const result = simulateTcpCongestion({ ...base, rounds: 5 });
    expect(result.rounds.map((r) => r.phase)).toEqual([
      'slow-start',
      'slow-start',
      'slow-start',
      'congestion-avoidance',
      'congestion-avoidance',
    ]);
  });

  it('halves ssthresh and continues in congestion avoidance on three duplicate ACKs', () => {
    const result = simulateTcpCongestion({ ...base, rounds: 6, lossRound: 4 });
    const loss = result.rounds[3];
    expect(loss.event).toBe('triple-duplicate-ack');
    expect(loss.ssthresh).toBe(8);
    expect(loss.nextCwnd).toBe(4);
    expect(result.rounds[4].cwnd).toBe(4);
    expect(result.rounds[4].phase).toBe('congestion-avoidance');
    expect(result.rounds[4].nextCwnd).toBe(5);
  });

  it('collapses the window to one MSS on a timeout', () => {
    const result = simulateTcpCongestion({ ...base, rounds: 6, timeoutRound: 3 });
    const timeout = result.rounds[2];
    expect(timeout.event).toBe('timeout');
    expect(timeout.nextCwnd).toBe(1);
    expect(result.rounds[3].cwnd).toBe(1);
    expect(result.rounds[3].phase).toBe('slow-start');
    expect(result.rounds[3].nextCwnd).toBe(2);
  });

  it('reports a peak and average window over the sampled rounds', () => {
    const result = simulateTcpCongestion({ ...base, rounds: 6 });
    expect(result.peakCwnd).toBe(10);
    expect(result.averageCwnd).toBeCloseTo((1 + 2 + 4 + 8 + 9 + 10) / 6);
    expect(result.steps).toHaveLength(8);
    expect(result.steps[result.steps.length - 1].title).toBe('Result');
  });

  it('clamps invalid configuration instead of producing nonsense', () => {
    const result = simulateTcpCongestion({ initialCwnd: 0, initialSsthresh: 0, rounds: 1, lossRound: -3, timeoutRound: 0 });
    expect(result.rounds).toHaveLength(2);
    expect(result.rounds[0].cwnd).toBe(1);
    expect(result.rounds[0].ssthresh).toBe(2);
    expect(result.rounds[0].phase).toBe('slow-start');
  });
});
