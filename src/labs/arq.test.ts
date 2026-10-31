import { describe, expect, it } from 'vitest';
import { ARQ_MODES, effectiveWindow, simulateArq, type ArqConfig, type ArqMode } from './arq';

const lossless: ArqConfig = {
  mode: 'stop-and-wait',
  frames: 5,
  window: 3,
  lossRate: 0,
  timeout: 4,
  seed: 1,
};

describe('effectiveWindow', () => {
  it('forces Stop-and-Wait to one frame and clamps sliding windows', () => {
    expect(effectiveWindow({ ...lossless, mode: 'stop-and-wait', window: 8 })).toBe(1);
    expect(effectiveWindow({ ...lossless, mode: 'go-back-n', window: 0 })).toBe(1);
    expect(effectiveWindow({ ...lossless, mode: 'go-back-n', window: 99 })).toBe(8);
  });
});

describe('simulateArq on a clean channel', () => {
  for (const { id } of ARQ_MODES) {
    it(`${id} delivers every frame with no retransmissions`, () => {
      const result = simulateArq({ ...lossless, mode: id as ArqMode });
      expect(result.delivered).toBe(5);
      expect(result.transmissions).toBe(5);
      expect(result.retransmissions).toBe(0);
      expect(result.stalled).toBe(false);
      expect(result.steps[result.steps.length - 1].title).toContain('complete');
    });
  }

  it('Stop-and-Wait keeps exactly one frame outstanding', () => {
    const result = simulateArq(lossless);
    expect(result.maxOutstanding).toBe(1);
  });

  it('Go-Back-N keeps at most one window of frames outstanding', () => {
    const result = simulateArq({ ...lossless, mode: 'go-back-n', frames: 6, window: 3 });
    expect(result.maxOutstanding).toBe(3);
    expect(result.delivered).toBe(6);
    expect(result.transmissions).toBe(6);
  });
});

describe('simulateArq with loss', () => {
  const lossy = (mode: ArqMode, seed: number): ReturnType<typeof simulateArq> =>
    simulateArq({ ...lossless, mode, frames: 8, window: 4, lossRate: 0.3, seed });

  it('retransmits after a lost frame or ACK', () => {
    for (const { id } of ARQ_MODES) {
      const result = lossy(id as ArqMode, 7);
      expect(result.retransmissions).toBeGreaterThan(0);
      expect(result.transmissions).toBeGreaterThan(result.delivered);
      expect(result.maxOutstanding).toBeLessThanOrEqual(result.windowSize);
    }
  });

  it('Selective Repeat does not resend frames that were already acknowledged', () => {
    const gbn = lossy('go-back-n', 7);
    const sr = lossy('selective-repeat', 7);
    expect(sr.delivered).toBe(gbn.delivered);
    expect(sr.transmissions).toBeLessThanOrEqual(gbn.transmissions);
  });

  it('is deterministic for a given seed', () => {
    const a = lossy('go-back-n', 42);
    const b = lossy('go-back-n', 42);
    expect(a.steps.map((s) => s.detail)).toEqual(b.steps.map((s) => s.detail));
    expect(a.transmissions).toBe(b.transmissions);
  });

  it('reports a stall instead of looping forever when nothing gets through', () => {
    const result = simulateArq({ ...lossless, mode: 'stop-and-wait', frames: 3, lossRate: 1 });
    expect(result.delivered).toBe(0);
    expect(result.stalled).toBe(true);
    expect(result.transmissions).toBeGreaterThan(0);
  });

  it('clamps out-of-range configuration', () => {
    const result = simulateArq({ ...lossless, frames: 0, window: 0, timeout: 0 });
    expect(result.delivered).toBe(1);
    expect(result.windowSize).toBe(1);
  });
});
