import { describe, expect, it } from 'vitest';
import { LABS, getLab } from './registry';

describe('lab registry', () => {
  it('exposes the six labs with unique ids', () => {
    expect(LABS).toHaveLength(6);
    expect(new Set(LABS.map((lab) => lab.id)).size).toBe(6);
    expect(LABS.map((lab) => lab.id)).toEqual(['osi', 'crc', 'hamming', 'arq', 'mac', 'tcp-congestion']);
  });

  it('looks a lab up by id', () => {
    expect(getLab('arq').title).toBe('ARQ Protocols');
  });
});
