import type { LabDefinition, LabId } from './types';

export const LABS: LabDefinition[] = [
  {
    id: 'osi',
    title: 'OSI Model',
    topic: 'Layered architecture',
    summary:
      'Follow one message down all seven layers on the sender and back up on the receiver, watching every header and trailer appear and disappear.',
  },
  {
    id: 'crc',
    title: 'CRC Error Detection',
    topic: 'Error detection',
    summary:
      'Run binary modulo-2 long division to build a frame check sequence, then verify a frame and corrupt a bit to see the CRC reject it.',
  },
  {
    id: 'hamming',
    title: 'Hamming Code',
    topic: 'Error correction',
    summary:
      'Place data and parity bits, compute the parity checks, corrupt a bit and read the syndrome to locate and repair the error.',
  },
  {
    id: 'arq',
    title: 'ARQ Protocols',
    topic: 'Reliable transfer',
    summary:
      'Compare Stop-and-Wait, Go-Back-N and Selective Repeat slot by slot with lossy frames and ACKs, windows and timeouts.',
  },
  {
    id: 'mac',
    title: 'Medium Access Control',
    topic: 'Shared channel',
    summary:
      'Simulate Pure ALOHA, Slotted ALOHA and CSMA/CD stations competing for one channel and compare measured throughput with theory.',
  },
  {
    id: 'tcp-congestion',
    title: 'TCP Congestion Control',
    topic: 'Congestion control',
    summary:
      'Watch cwnd double in slow start, grow linearly in congestion avoidance, and collapse on duplicate ACKs or a timeout.',
  },
];

export function getLab(id: LabId): LabDefinition {
  const lab = LABS.find((entry) => entry.id === id);
  if (!lab) throw new Error(`Unknown lab: ${id}`);
  return lab;
}
