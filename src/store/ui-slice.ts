import type { StateCreator } from 'zustand';
import type { DeviceType } from '../types/network';
import { loadPrefs, savePrefs, type UiPrefs } from '../utils/storage';

export type CanvasTool = 'select' | 'pan' | 'connect';

export const PANEL_LIMITS = {
  left: { min: 190, max: 420 },
  right: { min: 240, max: 520 },
  dock: { min: 120, max: 480 },
} as const;

export const DEFAULT_PREFS: UiPrefs = {
  theme: 'dark',
  leftWidth: 236,
  rightWidth: 320,
  dockHeight: 216,
  dockOpen: true,
  snapToGrid: true,
};

export function applyTheme(theme: UiPrefs['theme']): void {
  document.documentElement.dataset.theme = theme;
}

function clamp(value: number, { min, max }: { min: number; max: number }): number {
  return Math.min(max, Math.max(min, value));
}

const initialPrefs = loadPrefs(DEFAULT_PREFS);

export interface UiSlice extends UiPrefs {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  connectionSourceId: string | null;
  canvasTool: CanvasTool;
  pendingDeviceType: DeviceType | null;
  canvasZoom: number;

  setTheme: (theme: UiPrefs['theme']) => void;
  toggleTheme: () => void;
  setLeftWidth: (px: number) => void;
  setRightWidth: (px: number) => void;
  setDockHeight: (px: number) => void;
  setDockOpen: (open: boolean) => void;
  setSnapToGrid: (on: boolean) => void;

  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setCanvasTool: (tool: CanvasTool) => void;
  setConnectionSource: (id: string | null) => void;
  setPendingDeviceType: (type: DeviceType | null) => void;
  setCanvasZoom: (zoom: number) => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set, get) => {
  const persist = () => {
    const { theme, leftWidth, rightWidth, dockHeight, dockOpen, snapToGrid } = get();
    savePrefs({ theme, leftWidth, rightWidth, dockHeight, dockOpen, snapToGrid });
  };

  const patch = (updates: Partial<UiPrefs>) => {
    set(updates);
    persist();
  };

  return {
    ...initialPrefs,
    selectedNodeId: null,
    selectedEdgeId: null,
    connectionSourceId: null,
    canvasTool: 'select',
    pendingDeviceType: null,
    canvasZoom: 1,

    setTheme: (theme) => {
      applyTheme(theme);
      patch({ theme });
    },
    toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
    setLeftWidth: (px) => patch({ leftWidth: clamp(px, PANEL_LIMITS.left) }),
    setRightWidth: (px) => patch({ rightWidth: clamp(px, PANEL_LIMITS.right) }),
    setDockHeight: (px) => patch({ dockHeight: clamp(px, PANEL_LIMITS.dock) }),
    setDockOpen: (dockOpen) => patch({ dockOpen }),
    setSnapToGrid: (snapToGrid) => patch({ snapToGrid }),

    selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null, pendingDeviceType: null }),
    selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
    setCanvasTool: (canvasTool) =>
      set({ canvasTool, connectionSourceId: null, pendingDeviceType: null }),
    setConnectionSource: (connectionSourceId) => set({ connectionSourceId }),
    setPendingDeviceType: (pendingDeviceType) =>
      set({ pendingDeviceType, canvasTool: pendingDeviceType ? 'select' : get().canvasTool }),
    setCanvasZoom: (canvasZoom) => set({ canvasZoom }),
  };
};
