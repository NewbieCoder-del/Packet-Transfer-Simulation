import type { LabStep } from './types';
import { clamp, mulberry32, randomInt } from './prng';

export type MacMode = 'pure-aloha' | 'slotted-aloha' | 'csma-cd';

export interface MacConfig {
  mode: MacMode;
  stations: number;
  /** Probability that a station has a new frame waiting at the start of a slot. */
  arrivalRate: number;
  /** Slots a frame occupies on the channel. */
  frameSlots: number;
  slots: number;
  seed: number;
}

export interface MacBand {
  station: number;
  start: number;
  end: number;
  outcome: 'delivered' | 'collision' | 'aborted';
}

export interface MacResult {
  steps: LabStep[];
  bands: MacBand[];
  delivered: number;
  collisions: number;
  arrivals: number;
  dropped: number;
  deferred: number;
  offeredLoad: number;
  throughput: number;
  theoretical: number | null;
  slots: number;
}

export const MAC_MODES: { id: MacMode; label: string }[] = [
  { id: 'pure-aloha', label: 'Pure ALOHA' },
  { id: 'slotted-aloha', label: 'Slotted ALOHA' },
  { id: 'csma-cd', label: 'CSMA/CD' },
];

const QUEUE_LIMIT = 4;

export function simulateMac(rawConfig: MacConfig): MacResult {
  const cfg: MacConfig = {
    ...rawConfig,
    stations: clamp(Math.round(rawConfig.stations), 1, 8),
    arrivalRate: clamp(rawConfig.arrivalRate, 0, 1),
    frameSlots: clamp(Math.round(rawConfig.frameSlots), 1, 6),
    slots: clamp(Math.round(rawConfig.slots), 5, 40),
  };
  const rng = mulberry32(cfg.seed);
  const L = cfg.frameSlots;

  const backlog = new Array<number>(cfg.stations).fill(0);
  const backoff = new Array<number>(cfg.stations).fill(0);
  const attempt = new Array<number>(cfg.stations).fill(0);
  const bands: MacBand[] = [];
  let active: MacBand[] = [];
  let delivered = 0;
  let collisions = 0;
  let arrivals = 0;
  let dropped = 0;
  let deferred = 0;

  const steps: LabStep[] = [];
  const busyAt = (time: number) => active.some((band) => band.start <= time && band.end > time);

  for (let slot = 0; slot < cfg.slots; slot++) {
    const actions: string[] = [];

    // Frames that finished during this slot.
    for (const band of active) {
      if (band.end <= slot + 1) {
        if (band.outcome === 'delivered') delivered++;
        else if (band.outcome === 'collision') collisions++;
      }
    }
    active = active.filter((band) => band.end > slot + 1);

    // New frames.
    for (let s = 0; s < cfg.stations; s++) {
      if (rng() >= cfg.arrivalRate) continue;
      arrivals++;
      if (backlog[s] >= QUEUE_LIMIT) dropped++;
      else backlog[s]++;
    }

    const contenders: number[] = [];
    for (let s = 0; s < cfg.stations; s++) {
      if (backlog[s] === 0) continue;
      const transmitting = active.some((band) => band.station === s);
      if (transmitting) continue;

      if (cfg.mode === 'csma-cd') {
        if (busyAt(slot)) {
          deferred++;
          continue;
        }
        if (backoff[s] > 0) {
          backoff[s]--;
          actions.push(`station ${s} defers (${backoff[s]} backoff slots left)`);
          continue;
        }
      }
      contenders.push(s);
    }

    if (cfg.mode === 'csma-cd' && contenders.length > 1) {
      for (const s of contenders) {
        backlog[s]--;
        const wait = randomInt(rng, 2 ** Math.min(attempt[s] + 1, 5));
        attempt[s]++;
        backoff[s] = wait;
        const jam: MacBand = { station: s, start: slot, end: slot + 1, outcome: 'aborted' };
        bands.push(jam);
        active.push(jam);
        actions.push(`station ${s} aborted on collision, backoff ${wait}`);
      }
      collisions++;
    } else if (cfg.mode === 'csma-cd') {
      for (const s of contenders) {
        if (backlog[s] === 0) continue;
        backlog[s]--;
        attempt[s] = 0;
        const band: MacBand = { station: s, start: slot, end: slot + L, outcome: 'delivered' };
        bands.push(band);
        active.push(band);
        actions.push(`station ${s} transmits ${L} slot${L === 1 ? '' : 's'}`);
      }
    } else {
      // ALOHA variants: every station with a frame starts on its own; overlaps corrupt both frames.
      for (const s of contenders) {
        if (backlog[s] === 0) continue;
        backlog[s]--;
        // Pure ALOHA stations transmit whenever they like, so each draws its own offset.
        const startAt = cfg.mode === 'pure-aloha' ? slot + rng() : slot;
        const band: MacBand = { station: s, start: startAt, end: startAt + L, outcome: 'delivered' };
        const clash = active.find((other) => other.start < band.end && band.start < other.end);
        if (clash) {
          band.outcome = 'collision';
          clash.outcome = 'collision';
          actions.push(`station ${s} collided with station ${clash.station}`);
        } else {
          actions.push(
            cfg.mode === 'pure-aloha'
              ? `station ${s} starts at t = ${startAt.toFixed(2)}`
              : `station ${s} transmits at slot boundary`,
          );
        }
        bands.push(band);
        active.push(band);
      }
    }

    const airtimeUsed = bands
      .filter((band) => band.outcome === 'delivered')
      .reduce((sum, band) => sum + (band.end - band.start), 0);
    steps.push({
      title: `Slot ${slot}`,
      badge: `throughput ${((airtimeUsed / cfg.slots) * 100).toFixed(0)}%`,
      detail:
        actions.length > 0
          ? actions
          : [cfg.mode === 'csma-cd' ? 'channel idle, every station senses a free medium' : 'no station had a frame to send'],
      table: {
        columns: cfg.mode === 'csma-cd' ? ['Station', 'Queue', 'Backoff'] : ['Station', 'Queue'],
        rows: Array.from({ length: cfg.stations }, (_, s) =>
          cfg.mode === 'csma-cd' ? [`${s}`, `${backlog[s]}`, `${backoff[s]}`] : [`${s}`, `${backlog[s]}`],
        ),
      },
    });
  }

  for (const band of active) {
    if (band.outcome === 'delivered') delivered++;
    else if (band.outcome === 'collision') collisions++;
  }

  const offeredLoad = (arrivals * L) / cfg.slots;
  const throughput = (delivered * L) / cfg.slots;
  const theoretical =
    cfg.mode === 'pure-aloha'
      ? offeredLoad * Math.exp(-2 * offeredLoad)
      : cfg.mode === 'slotted-aloha'
        ? offeredLoad * Math.exp(-offeredLoad)
        : null;

  steps.push({
    title: 'Result',
    badge: `${delivered} delivered`,
    detail: [
      `${arrivals} frames were offered and ${delivered} got through; ${collisions} transmission${collisions === 1 ? '' : 's'} ended in collision.`,
      `Offered load G = ${offeredLoad.toFixed(2)} frame-times per slot (arrivals x ${L} slots / ${cfg.slots} slots).`,
      `Throughput S = ${(throughput * 100).toFixed(1)}% of the channel carries successful frames.`,
      theoretical === null
        ? 'CSMA/CD has no simple closed-form efficiency; the simulation shows how carrier sensing and backoff trade collisions for idle time.'
        : `Infinite-population theory predicts S = ${(theoretical * 100).toFixed(1)}% for this G (G·e^(-2G) for pure ALOHA, G·e^(-G) when slotted); the finite population here has only ${cfg.stations} station${cfg.stations === 1 ? '' : 's'}.`,
      dropped > 0 ? `${dropped} frame${dropped === 1 ? '' : 's'} were dropped because a station queue was full.` : '',
      deferred > 0 ? `${deferred} transmissions were deferred because the medium was busy.` : '',
    ].filter(Boolean),
    table: {
      columns: ['Metric', 'Value'],
      rows: [
        ['Offered load G', offeredLoad.toFixed(2)],
        ['Throughput S', `${(throughput * 100).toFixed(1)}%`],
        ['Delivered frames', `${delivered}`],
        ['Collisions', `${collisions}`],
        ['Deferred transmissions', `${deferred}`],
        ['Queue drops', `${dropped}`],
        ['Theoretical S', theoretical === null ? 'n/a' : `${(theoretical * 100).toFixed(1)}%`],
      ],
    },
  });

  return {
    steps,
    bands,
    delivered,
    collisions,
    arrivals,
    dropped,
    deferred,
    offeredLoad,
    throughput,
    theoretical,
    slots: cfg.slots,
  };
}
