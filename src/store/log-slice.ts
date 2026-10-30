import type { StateCreator } from 'zustand';

export interface LogEntry {
  id: number;
  time: number;
  message: string;
}

export interface LogSlice {
  logs: LogEntry[];
  addLog: (time: number, message: string) => void;
  clearLogs: () => void;
}

let logId = 0;

export const createLogSlice: StateCreator<LogSlice, [], [], LogSlice> = (set) => ({
  logs: [],
  addLog: (time, message) => {
    logId++;
    set((state) => ({
      logs: [...state.logs, { id: logId, time, message }],
    }));
  },
  clearLogs: () => set({ logs: [] }),
});
