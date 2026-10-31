import { describe, expect, it } from 'vitest';
import { buildOsiSteps } from './osi';
import { crc32Hex } from './crc';

const base = {
  message: 'Hello',
  srcIp: '192.168.1.10',
  dstIp: '192.168.1.20',
  transport: 'tcp' as const,
  srcPort: 49152,
  dstPort: 80,
};

function allText(steps: ReturnType<typeof buildOsiSteps>): string {
  return steps.map((step) => [step.title, step.badge, ...step.detail].join(' ')).join('\n');
}

describe('buildOsiSteps', () => {
  it('walks all seven layers down and back up (14 steps)', () => {
    const steps = buildOsiSteps(base);
    expect(steps).toHaveLength(14);
    expect(steps[0].title).toContain('Layer 7');
    expect(steps[13].title).toContain('Layer 7');
    for (let layer = 7; layer >= 1; layer--) {
      expect(steps.some((step) => step.title.startsWith(`Layer ${layer} `))).toBe(true);
    }
  });

  it('computes TCP header sizes and overhead', () => {
    const text = allText(buildOsiSteps(base));
    expect(text).toContain('25 bytes (5 payload + 20 header)');
    expect(text).toContain('45 bytes');
    expect(text).toContain('63 bytes');
    expect(text).toContain('18-byte frame overhead');
  });

  it('uses an 8-byte UDP header', () => {
    const text = allText(buildOsiSteps({ ...base, transport: 'udp', dstPort: 53 }));
    expect(text).toContain('13 bytes (5 payload + 8 header)');
    expect(text).toContain('33 bytes');
    expect(text).toContain('51 bytes');
    expect(text).toContain('46 bytes of headers');
  });

  it('puts the real CRC-32 of the payload in the trailer', () => {
    const fcs = crc32Hex(new TextEncoder().encode('Hello'));
    expect(allText(buildOsiSteps(base))).toContain(`0x${fcs}`);
  });

  it('falls back to a default message when none is typed', () => {
    const steps = buildOsiSteps({ ...base, message: '' });
    expect(allText(steps)).toContain('Hello, network!');
  });
});
