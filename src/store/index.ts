import { create } from 'zustand';
import { createNetworkSlice, type NetworkSlice } from './network-slice';
import { createUiSlice, type UiSlice } from './ui-slice';
import { createSimulationSlice, type SimulationSlice } from './simulation-slice';
import { createLogSlice, type LogSlice } from './log-slice';
import { createI18nSlice, type I18nSlice } from './i18n-slice';

export type AppStore = NetworkSlice & UiSlice & SimulationSlice & LogSlice & I18nSlice;

export const useStore = create<AppStore>()((...args) => ({
  ...createNetworkSlice(...args),
  ...createUiSlice(...args),
  ...createSimulationSlice(...args),
  ...createLogSlice(...args),
  ...createI18nSlice(...args),
}));
