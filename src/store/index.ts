import { create } from 'zustand';
import { createNetworkSlice, type NetworkSlice } from './network-slice';
import { createUiSlice, type UiSlice } from './ui-slice';
import { createSimulationSlice, type SimulationSlice } from './simulation-slice';
import { createLogSlice, type LogSlice } from './log-slice';

export type AppStore = NetworkSlice & UiSlice & SimulationSlice & LogSlice;

export const useStore = create<AppStore>()((...args) => ({
  ...createNetworkSlice(...args),
  ...createUiSlice(...args),
  ...createSimulationSlice(...args),
  ...createLogSlice(...args),
}));
