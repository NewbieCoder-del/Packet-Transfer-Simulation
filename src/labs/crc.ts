import type { LabStep } from './types';

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

/** Standard CRC-32 (reflected, poly 0xEDB88320) over the given bytes. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function crc32Hex(bytes: Uint8Array): string {
  return crc32(bytes).toString(16).toUpperCase().padStart(8, '0');
}

export interface DivisionRow {
  position: number;
  xorRow: string;
  after: string;
}

/** Binary long division: returns the remainder and every XOR step that was performed. */
export function divideBinary(dividend: string, divisor: string): { remainder: string; rows: DivisionRow[] } {
  const work = dividend.split('');
  const rows: DivisionRow[] = [];
  for (let i = 0; i <= work.length - divisor.length; i++) {
    if (work[i] !== '1') continue;
    for (let j = 0; j < divisor.length; j++) {
      work[i + j] = work[i + j] === divisor[j] ? '0' : '1';
    }
    rows.push({
      position: i,
      xorRow: divisor,
      after: work.slice(i, i + divisor.length).join(''),
    });
  }
  return { remainder: work.slice(dividend.length - (divisor.length - 1)).join(''), rows };
}

function isBits(value: string): boolean {
  return /^[01]+$/.test(value);
}

function flipped(bits: string, index: number): string {
  const chars = bits.split('');
  chars[index] = chars[index] === '0' ? '1' : '0';
  return chars.join('');
}

export interface CrcConfig {
  data: string;
  generator: string;
  /** 0-based bit position in the transmitted frame to corrupt, or -1 for a clean frame. */
  flipIndex: number;
}

export interface CrcResult {
  steps: LabStep[];
  error?: string;
  remainder: string;
  transmitted: string;
  received: string;
  checkRemainder: string;
  accepted: boolean;
}

export function buildCrcSteps(cfg: CrcConfig): CrcResult {
  const data = cfg.data.trim();
  const generator = cfg.generator.trim();
  const empty: CrcResult = {
    steps: [],
    remainder: '',
    transmitted: '',
    received: '',
    checkRemainder: '',
    accepted: false,
  };

  if (!isBits(data)) return { ...empty, error: 'Data must be a binary string such as 1101011011.' };
  if (!isBits(generator) || generator.length < 2 || generator[0] !== '1')
    return { ...empty, error: 'The generator must be binary, start with 1 and have at least 2 bits.' };
  if (data.length + generator.length - 1 > 64)
    return { ...empty, error: 'Keep data plus generator below 64 bits so the division stays readable.' };

  const degree = generator.length - 1;
  const padded = data + '0'.repeat(degree);
  const division = divideBinary(padded, generator);
  const transmitted = data + division.remainder;
  const corrupt =
    cfg.flipIndex >= 0 && cfg.flipIndex < transmitted.length ? flipped(transmitted, cfg.flipIndex) : transmitted;
  const check = divideBinary(corrupt, generator);
  const accepted = /^0+$/.test(check.remainder);

  const steps: LabStep[] = [];

  steps.push({
    title: 'Step 1 - Prepare the dividend',
    badge: `degree ${degree}`,
    detail: [
      `The generator G = ${generator} has ${degree} bit${degree === 1 ? '' : 's'} after its leading 1, so the CRC is ${degree} bits long.`,
      `Append ${degree} zero bit${degree === 1 ? '' : 's'} to the data D = ${data}.`,
      `Dividend = ${padded} (${padded.length} bits).`,
    ],
  });

  steps.push({
    title: 'Step 2 - Binary long division (modulo 2)',
    badge: `${division.rows.length} XOR step${division.rows.length === 1 ? '' : 's'}`,
    detail: [
      'At every step take the next 1 in the dividend, XOR the generator into the window, and move on.',
      'Subtraction and addition are the same operation in GF(2), so the remainder only ever contains XOR results.',
    ],
    table: {
      columns: ['Bit index', 'Dividend window', 'XOR with G', 'Result'],
      rows: division.rows.map((row) => [
        `${row.position}`,
        padded.slice(row.position, row.position + generator.length),
        row.xorRow,
        row.after,
      ]),
    },
  });

  steps.push({
    title: 'Step 3 - Remainder becomes the FCS',
    badge: `FCS ${division.remainder}`,
    detail: [
      `Remainder R = ${division.remainder} (${degree} bits). This is the frame check sequence appended to the data.`,
      `Transmitted frame T = D + R = ${transmitted}.`,
      'The receiver never needs the original data length: dividing the whole frame by G must give zero.',
    ],
  });

  steps.push({
    title: corrupt === transmitted ? 'Step 4 - Receiver verifies the frame' : 'Step 4 - Receiver verifies a corrupted frame',
    badge: accepted ? 'accepted' : 'error detected',
    detail:
      corrupt === transmitted
        ? [
            `The receiver divides T = ${transmitted} by G = ${generator}.`,
            `Remainder = ${check.remainder}, which is all zeros, so the frame is accepted.`,
          ]
        : [
            `Bit ${cfg.flipIndex} was flipped in transit: ${transmitted} became ${corrupt}.`,
            `The receiver divides the received frame by G and gets remainder ${check.remainder}.`,
            accepted
              ? 'The remainder is zero, so this corruption slipped through - CRC detects error bursts shorter than the generator, but it is not a correcting code.'
              : 'A non-zero remainder means the frame is discarded and the sender would have to retransmit it. CRC detects errors; it cannot repair them.',
          ],
  });

  return {
    steps,
    remainder: division.remainder,
    transmitted,
    received: corrupt,
    checkRemainder: check.remainder,
    accepted,
  };
}
