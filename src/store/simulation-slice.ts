import type { StateCreator } from 'zustand';
import type { SimEvent, AnimatedPacket, SimState } from '../types/network';

export interface SimulationSlice {
  eventQueue: SimEvent[];
  activePackets: AnimatedPacket[];
  simState: SimState;
  simTime: number;
  speed: number;
  enqueueEvent: (event: SimEvent) => void;
  dequeueEvent: () => SimEvent | undefined;
  addActivePacket: (packet: AnimatedPacket) => void;
  removeActivePacket: (id: string) => void;
  updatePacketProgress: (id: string, progress: number) => void;
  setSimState: (state: SimState) => void;
  setSpeed: (speed: number) => void;
  resetSimulation: () => void;
}

export const createSimulationSlice: StateCreator<SimulationSlice, [], [], SimulationSlice> = (set, get) => ({
  eventQueue: [],
  activePackets: [],
  simState: 'idle',
  simTime: 0,
  speed: 1,

  enqueueEvent: (event) => {
    set((state) => ({
      eventQueue: [...state.eventQueue, event].sort((a, b) => a.time - b.time),
    }));
  },

  dequeueEvent: () => {
    const queue = get().eventQueue;
    if (queue.length === 0) return undefined;
    const [first, ...rest] = queue;
    set({ eventQueue: rest, simTime: first.time });
    return first;
  },

  addActivePacket: (packet) => {
    set((state) => ({ activePackets: [...state.activePackets, packet] }));
  },

  removeActivePacket: (id) => {
    set((state) => ({ activePackets: state.activePackets.filter((p) => p.id !== id) }));
  },

  updatePacketProgress: (id, progress) => {
    set((state) => ({
      activePackets: state.activePackets.map((p) => (p.id === id ? { ...p, progress } : p)),
    }));
  },

  setSimState: (simState) => set({ simState }),
  setSpeed: (speed) => set({ speed }),

  resetSimulation: () =>
    set({ eventQueue: [], activePackets: [], simState: 'idle', simTime: 0 }),
});
