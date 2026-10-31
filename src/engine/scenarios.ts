import type { NetworkNode, NetworkInterface, ProtocolEvent, ProtocolType, Packet } from '../types/network';
import { generateId } from '../utils/mac';

export type ScenarioType = 'ping' | 'http-request' | 'dns-lookup' | 'udp-echo';

export interface Scenario {
  id: ScenarioType;
  label: string;
  description: string;
  /** Device type the destination picker prefers for this scenario. */
  prefers: 'host' | 'web-server' | 'dns-server';
}

export const SCENARIOS: Scenario[] = [
  { id: 'ping', label: 'Ping', description: 'ICMP Echo Request/Reply — ARP resolves the next hop automatically', prefers: 'host' },
  { id: 'http-request', label: 'HTTP Request', description: 'ARP → TCP 3-Way Handshake → HTTP GET → 200 OK', prefers: 'web-server' },
  { id: 'dns-lookup', label: 'DNS Lookup', description: 'DNS Query → Response carried over UDP port 53', prefers: 'dns-server' },
  { id: 'udp-echo', label: 'UDP Datagram', description: 'Connectionless datagram to UDP port 7 and its echo', prefers: 'host' },
];

/** Devices that can create PDUs: they need at least one configured, connected IP interface. */
export function addressableNodes(nodes: NetworkNode[]): NetworkNode[] {
  return nodes.filter((n) => n.type !== 'switch' && n.type !== 'router' && !!egressInterface(n));
}

function egressInterface(node: NetworkNode): NetworkInterface | undefined {
  return (
    node.interfaces.find((iface) => iface.ip && iface.connectedEdgeId) ??
    node.interfaces.find((iface) => iface.ip)
  );
}

export function addressOf(node: NetworkNode): string | undefined {
  return egressInterface(node)?.ip;
}

let ephemeralPort = 49152;

export function createScenarioEvents(
  scenario: ScenarioType,
  src: NetworkNode,
  dst: NetworkNode
): ProtocolEvent[] {
  const srcIface = egressInterface(src);
  const srcIp = srcIface?.ip;
  const dstIp = addressOf(dst);
  if (!srcIp || !dstIp || !srcIface) return [];

  const base = (type: ProtocolType, patch: Partial<Packet> = {}): ProtocolEvent => ({
    kind: 'protocol',
    id: generateId(),
    time: 0,
    type,
    srcNodeId: src.id,
    dstNodeId: dst.id,
    originNodeId: src.id,
    path: [],
    packet: {
      id: generateId(),
      srcMac: srcIface.mac,
      dstMac: 'FF:FF:FF:FF:FF:FF',
      srcIp,
      dstIp,
      protocol: type,
      ttl: 64,
      ...patch,
    },
  });

  if (scenario === 'ping') {
    return [base('icmp-echo', { payload: 'Ping' })];
  }

  if (scenario === 'udp-echo') {
    return [base('udp-datagram', { payload: 'Hello', srcPort: ephemeralPort++, dstPort: 7 })];
  }

  if (scenario === 'dns-lookup') {
    return [base('dns-query', { payload: 'www.example.com', srcPort: ephemeralPort++, dstPort: 53 })];
  }

  const clientPort = ephemeralPort++;
  const get = base('http-request', { payload: '/', srcPort: clientPort, dstPort: 80 });
  // The GET rides on the handshake: it is released by the source once the final ACK lands.
  return [{ ...base('tcp-syn', { srcPort: clientPort, dstPort: 80 }), followUp: get }];
}
