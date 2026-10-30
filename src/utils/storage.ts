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
