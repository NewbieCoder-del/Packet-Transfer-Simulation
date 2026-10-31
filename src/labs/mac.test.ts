import { describe, expect, it } from 'vitest';
import { MAC_MODES, simulateMac, type MacConfig, type MacMode } from './mac';

const base: MacConfig = {
  mode: 'slotted-aloha',
  stations: 4,
  arrivalRate: 0.4,
  frameSlots: 2,
  slots: 20,
  seed: 9,
};

describe('simulateMac', () => {
  it('is deterministic for the same seed and differs across seeds', () => {
    const a = simulateMac(base);
    const b = simulateMac(base);
    expect(a.delivered).toBe(b.delivered);
    expect(a.collisions).toBe(b.collisions);
    expect(a.bands).toEqual(b.bands);

    const other = simulateMac({ ...base, seed: 10 });
    expect(other.bands).not.toEqual(a.bands);
  });

  it('carries no traffic when no frame ever arrives', () => {
    const result = simulateMac({ ...base, arrivalRate: 0 });
    expect(result.arrivals).toBe(0);
    expect(result.delivered).toBe(0);
    expect(result.collisions).toBe(0);
    expect(result.offeredLoad).toBe(0);
    expect(result.throughput).toBe(0);
  });

  it('lets a single station transmit without collisions under every protocol', () => {
    for (const { id } of MAC_MODES) {
      const result = simulateMac({
        ...base,
        mode: id as MacMode,
        stations: 1,
        arrivalRate: 1,
        frameSlots: 1,
        slots: 8,
      });
      expect(result.arrivals).toBe(8);
      expect(result.delivered).toBe(8);
      expect(result.collisions).toBe(0);
      expect(result.throughput).toBeCloseTo(1);
    }
  });

  it('produces collisions when several ALOHA stations transmit at once', () => {
    const result = simulateMac({ ...base, mode: 'slotted-aloha', stations: 3, arrivalRate: 1, slots: 6 });
    expect(result.collisions).toBeGreaterThan(0);
    expect(result.delivered).toBeGreaterThanOrEqual(0);
    expect(result.delivered + result.collisions).toBeLessThanOrEqual(result.arrivals);
  });

  it('matches the infinite-population theory for ALOHA', () => {
    const pure = simulateMac({ ...base, mode: 'pure-aloha' });
    expect(pure.theoretical).toBeCloseTo(pure.offeredLoad * Math.exp(-2 * pure.offeredLoad));

    const slotted = simulateMac({ ...base, mode: 'slotted-aloha' });
    expect(slotted.theoretical).toBeCloseTo(slotted.offeredLoad * Math.exp(-slotted.offeredLoad));

    expect(simulateMac({ ...base, mode: 'csma-cd' }).theoretical).toBeNull();
  });

  it('defers CSMA/CD stations while the medium is busy and still delivers frames', () => {
    const result = simulateMac({
      ...base,
      mode: 'csma-cd',
      stations: 3,
      arrivalRate: 0.8,
      frameSlots: 3,
      slots: 30,
      seed: 3,
    });
    expect(result.deferred).toBeGreaterThan(0);
    expect(result.delivered).toBeGreaterThan(0);
    expect(result.offeredLoad).toBeGreaterThan(0);
    expect(result.throughput).toBeGreaterThan(0);
  });

  it('keeps every band inside the simulated window plus one frame time', () => {
    const result = simulateMac({ ...base, slots: 15 });
    for (const band of result.bands) {
      expect(band.start).toBeGreaterThanOrEqual(0);
      expect(band.end).toBeLessThanOrEqual(15 + base.frameSlots);
      expect(band.end).toBeGreaterThan(band.start);
    }
    expect(result.steps).toHaveLength(16);
  });
});
