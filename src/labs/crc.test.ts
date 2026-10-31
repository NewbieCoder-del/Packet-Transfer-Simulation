import { describe, expect, it } from 'vitest';
import { buildCrcSteps, crc32, crc32Hex, divideBinary } from './crc';

describe('crc32', () => {
  it('matches the standard check value for "123456789"', () => {
    const bytes = new TextEncoder().encode('123456789');
    expect(crc32(bytes)).toBe(0xcbf43926);
    expect(crc32Hex(bytes)).toBe('CBF43926');
  });
});

describe('divideBinary', () => {
  it('computes the classic remainder R = 1110', () => {
    const { remainder, rows } = divideBinary('11010110110000', '10011');
    expect(remainder).toBe('1110');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('computes R = 011 for D = 101110 and G = 1001', () => {
    expect(divideBinary('101110000', '1001').remainder).toBe('011');
  });
});

describe('buildCrcSteps', () => {
  it('appends the remainder to form the transmitted frame', () => {
    const result = buildCrcSteps({ data: '1101011011', generator: '10011', flipIndex: -1 });
    expect(result.remainder).toBe('1110');
    expect(result.transmitted).toBe('11010110111110');
    expect(result.received).toBe(result.transmitted);
    expect(result.accepted).toBe(true);
    expect(result.steps).toHaveLength(4);
  });

  it('detects a flipped bit and reports a non-zero remainder', () => {
    const result = buildCrcSteps({ data: '1101011011', generator: '10011', flipIndex: 3 });
    expect(result.accepted).toBe(false);
    expect(result.checkRemainder).not.toMatch(/^0+$/);
    expect(result.received).not.toBe(result.transmitted);
  });

  it('keeps a clean frame accepted for a different generator', () => {
    const result = buildCrcSteps({ data: '101110', generator: '1001', flipIndex: -1 });
    expect(result.transmitted).toBe('101110011');
    expect(result.accepted).toBe(true);
  });

  it('rejects non-binary input, bad generators and oversized frames', () => {
    expect(buildCrcSteps({ data: '12a', generator: '10011', flipIndex: -1 }).error).toBeTruthy();
    expect(buildCrcSteps({ data: '1010', generator: '011', flipIndex: -1 }).error).toBeTruthy();
    expect(buildCrcSteps({ data: '1010', generator: '1', flipIndex: -1 }).error).toBeTruthy();
    expect(buildCrcSteps({ data: '1'.repeat(70), generator: '10011', flipIndex: -1 }).error).toBeTruthy();
  });
});
