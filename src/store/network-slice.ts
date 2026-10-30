import type { StateCreator } from 'zustand';
import type { NetworkNode, NetworkEdge, DeviceType, NetworkInterface } from '../types/network';
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
  updateNodeLabel: (id: string, label: string) => void;
  /** Bind a link to a free port on each endpoint. Returns false when either device has no spare port. */
  addEdge: (fromNodeId: string, toNodeId: string) => boolean;
  removeEdge: (id: string) => void;
  toggleEdgeStatus: (id: string) => void;
  getNode: (id: string) => NetworkNode | undefined;
  saveToStorage: () => void;
  loadFromStorage: () => boolean;
  clearAll: () => void;
}

let nodeCount = 0;

function createInterfaces(type: DeviceType): NetworkInterface[] {
  const meta = DEVICE_DEFAULTS[type];
  return Array.from({ length: meta.portCount }, (_, i) => ({
    id: generateId(),
    name: meta.portCount === 1 ? meta.portPrefix : `${meta.portPrefix}${i + 1}`,
    mac: generateMac(),
    ...(meta.layer3 ? { ip: generateIp(), subnetMask: '255.255.255.0' } : {}),
  }));
}

function freePort(node: NetworkNode | undefined): NetworkInterface | undefined {
  return node?.interfaces.find((iface) => !iface.connectedEdgeId);
}

/** Older saved topologies predate port naming; fill in defaults so the inspector stays coherent. */
function normalizeNode(node: NetworkNode, type: DeviceType): NetworkNode {
  const meta = DEVICE_DEFAULTS[type];
  return {
    ...node,
    interfaces: (node.interfaces ?? []).map((iface, i) => ({
      ...iface,
      name: iface.name ?? (meta.portCount === 1 ? meta.portPrefix : `${meta.portPrefix}${i + 1}`),
    })),
  };
}

export const createNetworkSlice: StateCreator<NetworkSlice, [], [], NetworkSlice> = (set, get) => ({
  nodes: [],
  edges: [],

  addNode: (type, x, y) => {
    nodeCount++;
    const meta = DEVICE_DEFAULTS[type];

    const node: NetworkNode = {
      id: generateId(),
      type,
      label: `${meta.label}${nodeCount}`,
      x,
      y,
      interfaces: createInterfaces(type),
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

  updateNodeLabel: (id, label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, label: trimmed.slice(0, 24) } : n)),
    }));
  },

  addEdge: (fromNodeId, toNodeId) => {
    const { nodes, edges } = get();
    const fromNode = nodes.find((n) => n.id === fromNodeId);
    const toNode = nodes.find((n) => n.id === toNodeId);
    if (!fromNode || !toNode) return false;

    const alreadyConnected = edges.some(
      (e) =>
        (e.from.nodeId === fromNodeId && e.to.nodeId === toNodeId) ||
        (e.from.nodeId === toNodeId && e.to.nodeId === fromNodeId)
    );
    if (alreadyConnected) return false;

    const fromIface = freePort(fromNode);
    const toIface = freePort(toNode);
    if (!fromIface || !toIface) return false;

    const edge: NetworkEdge = {
      id: generateId(),
      from: { nodeId: fromNodeId, interfaceId: fromIface.id },
      to: { nodeId: toNodeId, interfaceId: toIface.id },
      status: 'up',
    };

    set((state) => ({
      edges: [...state.edges, edge],
      nodes: state.nodes.map((n) => {
        if (n.id !== fromNodeId && n.id !== toNodeId) return n;
        return {
          ...n,
          interfaces: n.interfaces.map((iface) =>
            iface.id === edge.from.interfaceId || iface.id === edge.to.interfaceId
              ? { ...iface, connectedEdgeId: edge.id }
              : iface
          ),
        };
      }),
    }));
    return true;
  },

  removeEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
      nodes: state.nodes.map((n) => ({
        ...n,
        interfaces: n.interfaces.map((iface) =>
          iface.connectedEdgeId === id ? { ...iface, connectedEdgeId: undefined } : iface
        ),
      })),
    }));
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
    const nodes = data.nodes.map((n) => normalizeNode(n, n.type));
    set({
      nodes: nodes.map((n) => ({
        ...n,
        interfaces: n.interfaces.map((iface) => {
          const link = data.edges.find(
            (e) => e.from.interfaceId === iface.id || e.to.interfaceId === iface.id
          );
          return { ...iface, connectedEdgeId: link?.id };
        }),
      })),
      edges: data.edges,
    });
    return true;
  },

  clearAll: () => {
    set({ nodes: [], edges: [] });
  },
});
