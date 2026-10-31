import { describe, expect, it } from 'vitest';
import { buildHammingSteps } from './hamming';

describe('buildHammingSteps', () => {
  it('encodes 1011 as the 7-bit codeword 0110011', () => {
    const result = buildHammingSteps('1011');
    expect(result.codeword).toBe('0110011');
    expect(result.syndrome).toBe(0);
    expect(result.corrected).toBe(result.codeword);
    expect(result.steps).toHaveLength(7);
  });

  it('locates and repairs a single-bit error at every position', () => {
    const clean = buildHammingSteps('1011').codeword;
    for (let position = 1; position <= clean.length; position++) {
      const result = buildHammingSteps('1011', position);
      expect(result.syndrome).toBe(position);
      expect(result.corrected).toBe(clean);
      expect(result.correctedAny).toBe(true);
    }
  });

  it('handles longer data and reports the right parity count', () => {
    const result = buildHammingSteps('11010011');
    // m = 8 needs r = 4 (2^4 = 16 >= 8 + 4 + 1 = 13), so n = 12.
    expect(result.codeword).toHaveLength(12);
    expect(result.parityBits.map((p) => p.position)).toEqual([1, 2, 4, 8]);
    expect(result.syndrome).toBe(0);
  });

  it('validates the input', () => {
    expect(buildHammingSteps('1021').error).toBeTruthy();
    expect(buildHammingSteps('1'.repeat(17)).error).toBeTruthy();
    expect(buildHammingSteps('1011', 99).error).toBeTruthy();
  });
});
