import type { StateCreator } from 'zustand';
import type { NetworkNode, NetworkEdge, DeviceType } from '../types/network';
import { DEVICE_DEFAULTS } from '../types/network';
import { generateId, generateMac } from '../utils/mac';
import { generateIp } from '../utils/ip';
import { saveTopology, loadTopology } from '../utils/storage';

export interface NetworkSlice {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  addNode: (type: DeviceType, x: number, y: number) => void;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  addEdge: (fromNodeId: string, toNodeId: string) => void;
  removeEdge: (id: string) => void;
  toggleEdgeStatus: (id: string) => void;
  getNode: (id: string) => NetworkNode | undefined;
  saveToStorage: () => void;
  loadFromStorage: () => boolean;
  clearAll: () => void;
}

let nodeCount = 0;

export const createNetworkSlice: StateCreator<NetworkSlice, [], [], NetworkSlice> = (set, get) => ({
  nodes: [],
  edges: [],

  addNode: (type, x, y) => {
    nodeCount++;
    const defaults = DEVICE_DEFAULTS[type];
    const id = generateId();
    const needsIp = type !== 'switch';
    const iface = {
      id: generateId(),
      mac: generateMac(),
      ...(needsIp ? { ip: generateIp(), subnetMask: '255.255.255.0' } : {}),
    };

    const node: NetworkNode = {
      id,
      type,
      label: `${defaults.label}${nodeCount}`,
      x,
      y,
      interfaces: [iface],
      arpTable: {},
      ...(type === 'switch' ? { macTable: {} } : {}),
      ...(type === 'router' ? { routingTable: [] } : {}),
    };

    set((state) => ({ nodes: [...state.nodes, node] }));
  },

  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.from.nodeId !== id && e.to.nodeId !== id),
    }));
  },

  updateNodePosition: (id, x, y) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    }));
  },

  addEdge: (fromNodeId, toNodeId) => {
    const fromNode = get().nodes.find((n) => n.id === fromNodeId);
    const toNode = get().nodes.find((n) => n.id === toNodeId);
    if (!fromNode || !toNode) return;

    const fromIface = fromNode.interfaces[0];
    const toIface = toNode.interfaces[0];
    if (!fromIface || !toIface) return;

    const alreadyConnected = get().edges.some(
      (e) =>
        (e.from.nodeId === fromNodeId && e.to.nodeId === toNodeId) ||
        (e.from.nodeId === toNodeId && e.to.nodeId === fromNodeId)
    );
    if (alreadyConnected) return;

    const edge: NetworkEdge = {
      id: generateId(),
      from: { nodeId: fromNodeId, interfaceId: fromIface.id },
      to: { nodeId: toNodeId, interfaceId: toIface.id },
      status: 'up',
    };

    set((state) => ({ edges: [...state.edges, edge] }));
  },

  removeEdge: (id) => {
    set((state) => ({ edges: state.edges.filter((e) => e.id !== id) }));
  },

  toggleEdgeStatus: (id) => {
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === id ? { ...e, status: e.status === 'up' ? 'down' : 'up' } : e
      ),
    }));
  },

  getNode: (id) => get().nodes.find((n) => n.id === id),

  saveToStorage: () => {
    saveTopology(get().nodes, get().edges);
  },

  loadFromStorage: () => {
    const data = loadTopology();
    if (!data) return false;
    set({ nodes: data.nodes, edges: data.edges });
    return true;
  },

  clearAll: () => {
    set({ nodes: [], edges: [] });
  },
});
