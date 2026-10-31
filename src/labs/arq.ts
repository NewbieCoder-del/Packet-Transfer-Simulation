import type { LabStep } from './types';
import { clamp, mulberry32 } from './prng';

export type ArqMode = 'stop-and-wait' | 'go-back-n' | 'selective-repeat';

export interface ArqConfig {
  mode: ArqMode;
  frames: number;
  window: number;
  /** Probability that a data frame or an ACK is lost, 0…0.6. */
  lossRate: number;
  /** Slots a sender waits for an ACK before retransmitting. */
  timeout: number;
  seed: number;
}

export interface ArqResult {
  steps: LabStep[];
  transmissions: number;
  retransmissions: number;
  delivered: number;
  stalled: boolean;
  windowSize: number;
  maxOutstanding: number;
}

export const ARQ_MODES: { id: ArqMode; label: string }[] = [
  { id: 'stop-and-wait', label: 'Stop-and-Wait' },
  { id: 'go-back-n', label: 'Go-Back-N' },
  { id: 'selective-repeat', label: 'Selective Repeat' },
];

const MAX_SLOTS = 60;

export function effectiveWindow(cfg: ArqConfig): number {
  return cfg.mode === 'stop-and-wait' ? 1 : clamp(Math.round(cfg.window), 1, 8);
}

export function simulateArq(rawConfig: ArqConfig): ArqResult {
  const cfg: ArqConfig = {
    ...rawConfig,
    frames: clamp(Math.round(rawConfig.frames), 1, 16),
    lossRate: clamp(rawConfig.lossRate, 0, 1),
    timeout: clamp(Math.round(rawConfig.timeout), 2, 12),
  };
  const n = cfg.frames;
  const win = effectiveWindow(cfg);
  const rng = mulberry32(cfg.seed);
  const lose = () => rng() < cfg.lossRate;

  const sent = new Array<boolean>(n).fill(false);
  const acked = new Array<boolean>(n).fill(false);
  const lastSend = new Array<number>(n).fill(-1);
  let base = 0;
  let nextNew = 0;
  let rxNext = 0;
  const rxBuffer = new Set<number>();

  /** Frames and ACKs travel for one slot, so every exchange costs at least two slots. */
  let dataArrivals: number[] = [];
  let ackArrivals: number[] = [];
  let transmissions = 0;
  let retransmissions = 0;
  let maxOutstanding = 0;

  const steps: LabStep[] = [];

  const outstanding = () => {
    let count = 0;
    for (let seq = base; seq < Math.min(n, base + win); seq++) if (sent[seq] && !acked[seq]) count++;
    return count;
  };

  const send = (seq: number, slot: number, actions: string[]) => {
    if (sent[seq]) retransmissions++;
    sent[seq] = true;
    lastSend[seq] = slot;
    transmissions++;
    if (lose()) actions.push(`sender → frame ${seq} (lost in transit)`);
    else {
      actions.push(`sender → frame ${seq}`);
      dataArrivals.push(seq);
    }
  };

  steps.push({
    title: 't = 0 - ready to send',
    badge: win === 1 ? 'Stop-and-Wait' : `window ${win}`,
    detail: [
      cfg.mode === 'stop-and-wait'
        ? 'Stop-and-Wait sends one frame, then waits for its ACK before sending the next one.'
        : cfg.mode === 'go-back-n'
          ? `Go-Back-N may have up to ${win} unacknowledged frames in flight; ACKs are cumulative.`
          : `Selective Repeat may have up to ${win} frames in flight, acknowledges each frame individually and buffers out-of-order frames.`,
      `Loss probability ${(cfg.lossRate * 100).toFixed(0)}%, timeout ${cfg.timeout} slots, ${n} frame${n === 1 ? '' : 's'} to deliver.`,
    ],
  });

  let lastActions: string[] = [];
  let finished = false;
  let t = 0;

  while (t < MAX_SLOTS && base < n) {
    t++;
    const actions: string[] = [];
    const arrivingNow = dataArrivals;
    const ackedNow = ackArrivals;
    dataArrivals = [];
    ackArrivals = [];

    // 1. Receiver handles the data that just arrived, and queues its ACK for the next slot.
    for (const seq of arrivingNow) {
      if (cfg.mode === 'selective-repeat') {
        if (seq >= rxNext && seq < rxNext + win && !rxBuffer.has(seq)) {
          rxBuffer.add(seq);
          actions.push(`receiver buffered ${seq}`);
          // Buffered frames are handed up as soon as the gap before them closes.
          while (rxBuffer.has(rxNext)) {
            rxBuffer.delete(rxNext);
            rxNext++;
          }
        } else {
          actions.push(`receiver saw duplicate ${seq}`);
        }
      } else if (seq === rxNext) {
        rxNext++;
        actions.push(`receiver delivered ${seq} in order`);
      } else {
        actions.push(`receiver discarded ${seq} (expected ${rxNext})`);
      }
    }
    const ackValues =
      cfg.mode === 'selective-repeat'
        ? // Every frame inside the receive window is acknowledged, including duplicates whose ACK
          // was lost; otherwise one lost ACK would strand the sender's window forever.
          [...new Set(arrivingNow.filter((seq) => seq < rxNext + win))]
        : arrivingNow.length > 0 && rxNext > 0
          ? [rxNext - 1]
          : [];
    for (const value of ackValues) {
      if (lose()) actions.push(`ACK ${value} lost`);
      else {
        actions.push(`ACK ${value} sent`);
        ackArrivals.push(value);
      }
    }

    // 2. Sender consumes the ACKs that arrived in this slot.
    for (const ack of ackedNow) {
      if (cfg.mode === 'selective-repeat') {
        if (!acked[ack]) {
          acked[ack] = true;
          actions.push(`sender marked ${ack} acknowledged`);
        }
      } else {
        for (let seq = base; seq <= ack && seq < n; seq++) acked[seq] = true;
      }
    }
    while (base < n && acked[base]) base++;

    // 3. Timeouts.
    if (cfg.mode === 'selective-repeat') {
      for (let seq = base; seq < Math.min(n, base + win); seq++) {
        if (sent[seq] && !acked[seq] && t - lastSend[seq] >= cfg.timeout) {
          actions.push(`timeout on ${seq}`);
          send(seq, t, actions);
        }
      }
    } else if (base < n && sent[base] && t - lastSend[base] >= cfg.timeout) {
      actions.push(`timeout on ${base}`);
      if (cfg.mode === 'stop-and-wait') send(base, t, actions);
      else {
        for (let seq = base; seq < Math.min(n, base + win); seq++) {
          if (sent[seq] && !acked[seq]) send(seq, t, actions);
        }
      }
    }

    // 4. New frames enter the send window.
    if (cfg.mode === 'stop-and-wait') {
      if (base < n && !sent[base]) send(base, t, actions);
    } else {
      while (nextNew < n && nextNew < base + win) send(nextNew++, t, actions);
    }

    maxOutstanding = Math.max(maxOutstanding, outstanding());
    const delivered = acked.filter(Boolean).length;

    steps.push({
      title: `t = ${t}`,
      badge: `${delivered}/${n} delivered`,
      detail: actions.length > 0 ? actions : ['channel idle, no frame or ACK moved'],
      table: {
        columns: ['Frame', 'State', 'Last sent at'],
        rows: Array.from({ length: n }, (_, seq) => [
          `${seq}`,
          acked[seq] ? 'delivered' : sent[seq] ? 'in flight / unacknowledged' : 'not sent yet',
          lastSend[seq] >= 0 ? `${lastSend[seq]}` : '-',
        ]),
      },
    });
    lastActions = actions;

    if (base >= n) finished = true;
  }

  const delivered = acked.filter(Boolean).length;
  const useful = transmissions - retransmissions;

  steps.push({
    title: finished ? 'Transfer complete' : 'Gave up - the channel never delivered everything',
    badge: finished ? `${transmissions} transmissions` : `${delivered}/${n} delivered`,
    detail: finished
      ? [
          `${delivered} frame${delivered === 1 ? '' : 's'} delivered in ${transmissions} transmissions, ${retransmissions} of them retransmissions.`,
          `${useful} of ${transmissions} transmissions were first attempts (${((useful / transmissions) * 100).toFixed(0)}%).`,
          cfg.mode === 'selective-repeat'
            ? 'Selective Repeat retransmits only the frames that were actually lost, so a long window costs less than under Go-Back-N.'
            : cfg.mode === 'go-back-n'
              ? 'Go-Back-N resends every frame from the lost one onwards, because its receiver only accepts in-order data.'
              : 'Stop-and-Wait never has more than one frame outstanding, so it recovers simply but wastes the link between exchanges.',
        ]
      : [
          `Stopped after ${MAX_SLOTS} slots with ${delivered} of ${n} frame${n === 1 ? '' : 's'} delivered.`,
          'At this loss rate the protocol cannot make progress inside the simulated window.',
          lastActions.length > 0 ? `Last activity: ${lastActions[lastActions.length - 1]}.` : '',
        ].filter(Boolean),
  });

  return {
    steps,
    transmissions,
    retransmissions,
    delivered,
    stalled: !finished,
    windowSize: win,
    maxOutstanding,
  };
}
