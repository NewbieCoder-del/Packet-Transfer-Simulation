import { describe, expect, it } from 'vitest';
import type { NetworkEdge, NetworkNode, Packet, SimEvent } from '../types/network';
import { processEvent, type EngineOutcome } from './simulator';

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

function node(args: {
  id: string;
  type: NetworkNode['type'];
  label: string;
  interfaces: Array<{ id: string; name: string; mac: string; ip?: string; mask?: string }>;
  gateway?: string;
}): NetworkNode {
  return {
    id: args.id,
    type: args.type,
    label: args.label,
    x: 0,
    y: 0,
    interfaces: args.interfaces.map((iface) => ({
      id: iface.id,
      name: iface.name,
      mac: iface.mac,
      ...(iface.ip ? { ip: iface.ip } : {}),
      ...(iface.mask ? { subnetMask: iface.mask } : {}),
    })),
    arpTable: {},
    ...(args.type === 'switch' ? { macTable: {} } : {}),
    ...(args.type === 'router' ? { routingTable: [] } : {}),
    ...(args.gateway ? { gateway: args.gateway } : {}),
  };
}

function link(id: string, a: NetworkNode, aPort: string, b: NetworkNode, bPort: string): NetworkEdge {
  a.interfaces.find((iface) => iface.id === aPort)!.connectedEdgeId = id;
  b.interfaces.find((iface) => iface.id === bPort)!.connectedEdgeId = id;
  return { id, from: { nodeId: a.id, interfaceId: aPort }, to: { nodeId: b.id, interfaceId: bPort }, status: 'up' };
}

function applyMutations(nodes: NetworkNode[], result: EngineOutcome): NetworkNode[] {
  return nodes.map((current) => {
    const arp = result.arpMutations.filter((m) => m.nodeId === current.id);
    const mac = result.macMutations.filter((m) => m.nodeId === current.id);
    const tcp = result.tcpMutations.find((m) => m.nodeId === current.id);
    if (arp.length === 0 && mac.length === 0 && !tcp) return current;
    return {
      ...current,
      ...(arp.length > 0
        ? { arpTable: { ...current.arpTable, ...Object.fromEntries(arp.map((m) => [m.ip, m.mac])) } }
        : {}),
      ...(mac.length > 0 && current.macTable !== undefined
        ? { macTable: { ...current.macTable, ...Object.fromEntries(mac.map((m) => [m.entry.mac, m.entry])) } }
        : {}),
      ...(tcp ? { tcpState: tcp.tcpState } : {}),
    };
  });
}

/** Drives the pure engine to completion exactly like the simulation hook, minus animation timing. */
function runToCompletion(events: SimEvent[], initialNodes: NetworkNode[], edges: NetworkEdge[]) {
  let nodes = initialNodes;
  let queue = [...events].sort((a, b) => a.time - b.time);
  const logs: string[] = [];
  const animations: EngineOutcome['animations'] = [];
  let processed = 0;

  while (queue.length > 0 && processed < 200) {
    const event = queue.shift()!;
    const result = processEvent(event, nodes, edges);
    nodes = applyMutations(nodes, result);
    queue = [...queue, ...result.newEvents].sort((a, b) => a.time - b.time);
    logs.push(...result.logs.map((log) => log.text));
    animations.push(...result.animations);
    processed++;
  }

  return { nodes, queue, logs, animations };
}

function pingFrom(source: NetworkNode, sourceIfaceIp: string, sourceMac: string, destination: NetworkNode, destinationIp: string): SimEvent {
  const packet: Packet = {
    id: nextId('pkt'),
    srcMac: sourceMac,
    dstMac: 'FF:FF:FF:FF:FF:FF',
    srcIp: sourceIfaceIp,
    dstIp: destinationIp,
    protocol: 'icmp-echo',
    ttl: 64,
    payload: 'Ping',
  };
  return {
    kind: 'protocol',
    id: nextId('evt'),
    time: 0,
    type: 'icmp-echo',
    srcNodeId: source.id,
    dstNodeId: destination.id,
    originNodeId: source.id,
    path: [],
    packet,
  };
}

describe('Checkpoint B regression - two hosts through a switch', () => {
  const pc1 = node({
    id: 'pc1',
    type: 'host',
    label: 'PC1',
    interfaces: [{ id: 'pc1-eth', name: 'Ethernet', mac: 'AA:00:00:00:00:01', ip: '192.168.1.10', mask: '255.255.255.0' }],
  });
  const pc2 = node({
    id: 'pc2',
    type: 'host',
    label: 'PC2',
    interfaces: [{ id: 'pc2-eth', name: 'Ethernet', mac: 'AA:00:00:00:00:02', ip: '192.168.1.20', mask: '255.255.255.0' }],
  });
  const sw = node({
    id: 'sw',
    type: 'switch',
    label: 'Switch1',
    interfaces: [
      { id: 'sw-p1', name: 'FastEthernet0/1', mac: 'BB:00:00:00:00:01' },
      { id: 'sw-p2', name: 'FastEthernet0/2', mac: 'BB:00:00:00:00:02' },
    ],
  });
  sw.macTable = {};
  const edges = [link('e1', pc1, 'pc1-eth', sw, 'sw-p1'), link('e2', pc2, 'pc2-eth', sw, 'sw-p2')];

  it('resolves ARP, floods, learns MACs and delivers the echo reply', () => {
    const { nodes, queue, logs } = runToCompletion(
      [pingFrom(pc1, '192.168.1.10', 'AA:00:00:00:00:01', pc2, '192.168.1.20')],
      [pc1, pc2, sw],
      edges
    );

    expect(queue).toHaveLength(0);
    expect(logs.some((text) => text.includes('broadcasts: Who has 192.168.1.20'))).toBe(true);
    expect(logs.some((text) => text.includes('received Echo Request'))).toBe(true);
    expect(logs.some((text) => text.includes('received Echo Reply'))).toBe(true);

    const afterPc1 = nodes.find((n) => n.id === 'pc1')!;
    const afterSwitch = nodes.find((n) => n.id === 'sw')!;
    expect(afterPc1.arpTable['192.168.1.20']).toBe('AA:00:00:00:00:02');
    expect(afterSwitch.macTable?.['AA:00:00:00:00:01']?.interfaceId).toBe('sw-p1');
    expect(afterSwitch.macTable?.['AA:00:00:00:00:02']?.interfaceId).toBe('sw-p2');
  });
});

describe('Checkpoint B regression - hosts across a router', () => {
  const pc1 = node({
    id: 'pc1',
    type: 'host',
    label: 'PC1',
    interfaces: [{ id: 'pc1-eth', name: 'Ethernet', mac: 'AA:00:00:00:00:01', ip: '192.168.1.10', mask: '255.255.255.0' }],
    gateway: '192.168.1.1',
  });
  const sw1 = node({
    id: 'sw1',
    type: 'switch',
    label: 'Switch1',
    interfaces: [
      { id: 'sw1-p1', name: 'FastEthernet0/1', mac: 'BB:00:00:00:00:01' },
      { id: 'sw1-p2', name: 'FastEthernet0/2', mac: 'BB:00:00:00:00:02' },
    ],
  });
  const router = node({
    id: 'r1',
    type: 'router',
    label: 'Router1',
    interfaces: [
      { id: 'r1-g1', name: 'GigabitEthernet0/1', mac: 'CC:00:00:00:00:01', ip: '192.168.1.1', mask: '255.255.255.0' },
      { id: 'r1-g2', name: 'GigabitEthernet0/2', mac: 'CC:00:00:00:00:02', ip: '192.168.2.1', mask: '255.255.255.0' },
    ],
  });
  const sw2 = node({
    id: 'sw2',
    type: 'switch',
    label: 'Switch2',
    interfaces: [
      { id: 'sw2-p1', name: 'FastEthernet0/1', mac: 'DD:00:00:00:00:01' },
      { id: 'sw2-p2', name: 'FastEthernet0/2', mac: 'DD:00:00:00:00:02' },
    ],
  });
  const pc2 = node({
    id: 'pc2',
    type: 'host',
    label: 'PC2',
    interfaces: [{ id: 'pc2-eth', name: 'Ethernet', mac: 'AA:00:00:00:00:02', ip: '192.168.2.20', mask: '255.255.255.0' }],
    gateway: '192.168.2.1',
  });
  const edges = [
    link('e1', pc1, 'pc1-eth', sw1, 'sw1-p1'),
    link('e2', sw1, 'sw1-p2', router, 'r1-g1'),
    link('e3', router, 'r1-g2', sw2, 'sw2-p1'),
    link('e4', sw2, 'sw2-p2', pc2, 'pc2-eth'),
  ];

  it('routes across subnets, rewrites Layer-2 per hop, decrements TTL and returns the reply', () => {
    const { nodes, queue, logs, animations } = runToCompletion(
      [pingFrom(pc1, '192.168.1.10', 'AA:00:00:00:00:01', pc2, '192.168.2.20')],
      [pc1, sw1, router, sw2, pc2].map((n) => ({ ...n, arpTable: {}, ...(n.macTable ? { macTable: {} } : {}) })),
      edges
    );

    expect(queue).toHaveLength(0);
    expect(logs.some((text) => text.includes('[ROUTE] Router1 forwards 192.168.1.10 → 192.168.2.20'))).toBe(true);
    expect(logs.some((text) => text.includes('received Echo Request'))).toBe(true);
    expect(logs.some((text) => text.includes('received Echo Reply'))).toBe(true);

    const afterPc1 = nodes.find((n) => n.id === 'pc1')!;
    const afterRouter = nodes.find((n) => n.id === 'r1')!;
    const afterPc2 = nodes.find((n) => n.id === 'pc2')!;
    expect(afterPc1.arpTable['192.168.1.1']).toBe('CC:00:00:00:00:01');
    expect(afterRouter.arpTable['192.168.1.10']).toBe('AA:00:00:00:00:01');
    expect(afterRouter.arpTable['192.168.2.20']).toBe('AA:00:00:00:00:02');
    expect(afterPc2.arpTable['192.168.2.1']).toBe('CC:00:00:00:00:02');

    const routedHop = animations.find(
      (anim) =>
        anim.fromNodeId === 'r1' &&
        anim.toNodeId === 'sw2' &&
        anim.packet.protocol === 'icmp-echo'
    );
    expect(routedHop?.packet.ttl).toBe(63);
    expect(routedHop?.packet.srcMac).toBe('CC:00:00:00:00:02');
    expect(routedHop?.packet.dstMac).toBe('AA:00:00:00:00:02');
  });
});
