import type { NetworkNode, NetworkEdge } from '../types/network';

const STORAGE_KEY = 'network-simulator-topology';

export interface SavedTopology {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  savedAt: string;
}

export function saveTopology(nodes: NetworkNode[], edges: NetworkEdge[]): void {
  const data: SavedTopology = {
    nodes,
    edges,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadTopology(): SavedTopology | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedTopology;
  } catch {
    return null;
  }
}

export function clearTopology(): void {
  localStorage.removeItem(STORAGE_KEY);
}

const PREFS_KEY = 'netlab-prefs';

export interface UiPrefs {
  theme: 'dark' | 'light';
  leftWidth: number;
  rightWidth: number;
  dockHeight: number;
  dockOpen: boolean;
  snapToGrid: boolean;
}

export function loadPrefs(fallback: UiPrefs): UiPrefs {
  const raw = localStorage.getItem(PREFS_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function savePrefs(prefs: UiPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
