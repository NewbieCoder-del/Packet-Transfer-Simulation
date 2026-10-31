import type { LabStep } from './types';

export interface HammingParity {
  position: number;
  covers: number[];
  value: string;
}

export interface HammingResult {
  steps: LabStep[];
  error?: string;
  dataBits: string;
  codeword: string;
  received: string;
  syndrome: number;
  corrected: string;
  correctedAny: boolean;
  parityBits: HammingParity[];
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

function xorOf(bits: string): string {
  return bits.split('').reduce((acc, bit) => (acc === bit ? '0' : '1'), '0');
}

/** Data bits fill the non-parity positions from the left; position 1 is the leftmost bit. */
export function buildHammingSteps(rawData: string, flipPosition = 0): HammingResult {
  const data = rawData.trim();
  const empty: HammingResult = {
    steps: [],
    dataBits: data,
    codeword: '',
    received: '',
    syndrome: 0,
    corrected: '',
    correctedAny: false,
    parityBits: [],
  };

  if (!/^[01]+$/.test(data)) return { ...empty, error: 'Data must be a binary string such as 1011.' };
  if (data.length > 16) return { ...empty, error: 'Keep the data at 16 bits or fewer so every parity check stays readable.' };

  const m = data.length;
  let r = 1;
  while (2 ** r < m + r + 1) r++;
  const n = m + r;

  if (flipPosition > n) {
    return { ...empty, error: `The codeword has ${n} positions, so the error position must be 1…${n}.` };
  }

  const word: (string | null)[] = Array.from({ length: n + 1 }, () => null);
  const dataPositions: number[] = [];
  let nextBit = 0;
  for (let pos = 1; pos <= n; pos++) {
    if (isPowerOfTwo(pos)) continue;
    word[pos] = data[nextBit++] ?? '0';
    dataPositions.push(pos);
  }

  const parityBits: HammingParity[] = [];
  for (let j = 1; j <= n; j *= 2) {
    const covers: number[] = [];
    for (let pos = 1; pos <= n; pos++) {
      if (pos === j) continue;
      if ((pos & j) !== 0) covers.push(pos);
    }
    word[j] = xorOf(covers.map((pos) => word[pos] ?? '0').join(''));
    parityBits.push({ position: j, covers, value: word[j] as string });
  }

  const render = (chars: (string | null)[]) =>
    chars
      .slice(1)
      .map((c) => c ?? '?')
      .join('');

  const codeword = render(word);
  const receivedChars = word.slice();
  let received = codeword;
  const flipped = flipPosition > 0 && flipPosition <= n;
  if (flipped) {
    receivedChars[flipPosition] = receivedChars[flipPosition] === '1' ? '0' : '1';
    received = render(receivedChars);
  }

  const syndromeRows: string[][] = [];
  let syndrome = 0;
  for (const parity of parityBits) {
    // The check covers the parity bit itself plus every position it protects.
    const group = [parity.position, ...parity.covers].sort((a, b) => a - b);
    const covered = group.map((pos) => receivedChars[pos] as string).join('');
    const check = xorOf(covered);
    if (check === '1') syndrome += parity.position;
    syndromeRows.push([
      `p${parity.position}`,
      `positions ${group.join(', ')}`,
      covered,
      check,
    ]);
  }

  const correctedChars = receivedChars.slice();
  if (syndrome > 0 && syndrome <= n) correctedChars[syndrome] = correctedChars[syndrome] === '1' ? '0' : '1';
  const corrected = render(correctedChars);

  const steps: LabStep[] = [];

  steps.push({
    title: 'Step 1 - How many parity bits?',
    badge: `Hamming(${n},${m})`,
    detail: [
      `The data has m = ${m} bits. We need the smallest r with 2^r >= m + r + 1, which is r = ${r}.`,
      `The codeword therefore has n = ${n} positions: ${r} parity bits and ${m} data bits.`,
      'Parity bits live at the power-of-two positions 1, 2, 4, 8, …; data fills the rest.',
    ],
    table: {
      columns: ['Position', '1', ...Array.from({ length: n - 1 }, (_, i) => `${i + 2}`)],
      rows: [
        ['Kind', ...Array.from({ length: n }, (_, i) => (isPowerOfTwo(i + 1) ? 'parity' : 'data'))],
      ],
    },
  });

  steps.push({
    title: 'Step 2 - Place the data bits',
    badge: `${m} data bits`,
    detail: [
      `Data ${data} is written into positions ${dataPositions.join(', ')} (the non-power-of-two slots, left to right).`,
      `Layout so far: ${render(word)} - the ? marks are the parity positions still to compute.`,
    ],
  });

  steps.push({
    title: 'Step 3 - Compute each parity bit',
    badge: `${r} parity bits`,
    detail: [
      'A parity bit is the XOR of every position it protects, and every position belongs to the checks whose index bit it has set.',
      'XOR of an even number of 1s is 0, so the parity bit makes the protected group have even parity.',
    ],
    table: {
      columns: ['Parity', 'Covers positions', 'Bits protected', 'Value'],
      rows: parityBits.map((p) => [
        `${p.position}`,
        p.covers.join(', '),
        p.covers.map((pos) => word[pos] ?? '0').join(''),
        p.value,
      ]),
    },
  });

  steps.push({
    title: 'Step 4 - The codeword',
    badge: codeword,
    detail: [
      `Codeword = ${codeword} (${n} bits), parity bits at positions ${parityBits.map((p) => p.position).join(', ')}.`,
      'This is what the sender puts on the wire.',
    ],
  });

  if (flipped) {
    steps.push({
      title: `Step 5 - One bit is corrupted at position ${flipPosition}`,
      badge: 'channel error',
      detail: [
        `The codeword ${codeword} arrives as ${received}.`,
        'A single-bit error is the case Hamming codes are designed to repair.',
      ],
    });
  } else {
    steps.push({
      title: 'Step 5 - The codeword arrives intact',
      badge: 'no error injected',
      detail: [`The receiver gets ${received}.`, 'Set an error position in the controls to inject a single-bit error.'],
    });
  }

  steps.push({
    title: 'Step 6 - Syndrome',
    badge: syndrome === 0 ? 'syndrome 0' : `syndrome ${syndrome}`,
    detail: [
      'Each check re-computes its parity over the received bits; a failed check contributes a 1.',
      syndrome === 0
        ? 'All checks agree, so the syndrome is 0 and no error is detected.'
        : `The failed checks form the binary number ${syndrome}, which is exactly the position of the corrupted bit.`,
    ],
    table: {
      columns: ['Check', 'Covers', 'Received bits', 'Failed?'],
      rows: syndromeRows.map((row) => [row[0], row[1], row[2], row[3] === '1' ? 'yes' : 'no']),
    },
  });

  steps.push({
    title: syndrome === 0 ? 'Step 7 - Nothing to correct' : `Step 7 - Correct position ${syndrome}`,
    badge: corrected,
    detail:
      syndrome === 0
        ? [`The delivered codeword is ${corrected}, data ${data}.`]
        : [
            `Flipping position ${syndrome} turns ${received} back into ${corrected}, the original codeword.`,
            `The receiver recovers data ${data}.`,
            'A Hamming code repairs one bit per codeword; two bit errors can look like a valid single-bit error, which is why stronger codes add an overall parity bit.',
          ],
  });

  return {
    steps,
    dataBits: data,
    codeword,
    received,
    syndrome,
    corrected,
    correctedAny: syndrome > 0 && corrected === codeword,
    parityBits,
  };
}
