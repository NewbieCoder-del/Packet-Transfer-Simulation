import type { StateCreator } from 'zustand';
import type { Packet } from '../types/network';

export interface LogEntry {
  id: number;
  time: number;
  message: string;
  /** The PDU that produced this event, when the event is about one. Click a row to inspect it. */
  packet?: Packet;
  nodeId?: string;
}

export interface LogSlice {
  logs: LogEntry[];
  addLog: (time: number, message: string, packet?: Packet, nodeId?: string) => void;
  clearLogs: () => void;
}

let logId = 0;

export const createLogSlice: StateCreator<LogSlice, [], [], LogSlice> = (set) => ({
  logs: [],
  addLog: (time, message, packet, nodeId) => {
    logId++;
    set((state) => ({
      logs: [...state.logs, { id: logId, time, message, packet, nodeId }],
    }));
  },
  clearLogs: () => set({ logs: [] }),
});
