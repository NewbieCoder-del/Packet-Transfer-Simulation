export type DeviceType = 'host' | 'switch' | 'router' | 'dns-server' | 'web-server';

export interface NetworkInterface {
  id: string;
  mac: string;
  ip?: string;
  subnetMask?: string;
  connectedEdgeId?: string;
}

export interface RoutingEntry {
  destination: string;
  mask: string;
  gateway: string;
  interfaceId: string;
}

export type TcpState =
  | 'CLOSED'
  | 'LISTEN'
  | 'SYN-SENT'
  | 'SYN-RECEIVED'
  | 'ESTABLISHED'
  | 'FIN-WAIT-1'
  | 'FIN-WAIT-2'
  | 'CLOSE-WAIT'
  | 'LAST-ACK'
  | 'TIME-WAIT';

export interface NetworkNode {
  id: string;
  type: DeviceType;
  label: string;
  x: number;
  y: number;
  interfaces: NetworkInterface[];
  arpTable: Record<string, string>; // IP → MAC
  macTable?: Record<string, string>; // MAC → port (switch only)
  routingTable?: RoutingEntry[];
  tcpState?: TcpState;
}

export interface NetworkEdge {
  id: string;
  from: { nodeId: string; interfaceId: string };
  to: { nodeId: string; interfaceId: string };
  status: 'up' | 'down';
}

export type ProtocolType =
  | 'arp-request' | 'arp-reply'
  | 'tcp-syn' | 'tcp-syn-ack' | 'tcp-ack' | 'tcp-fin'
  | 'dns-query' | 'dns-response'
  | 'http-request' | 'http-response'
  | 'icmp-echo' | 'icmp-reply';

export interface Packet {
  id: string;
  srcMac: string;
  dstMac: string;
  srcIp: string;
  dstIp: string;
  protocol: ProtocolType;
  ttl: number;
  payload?: string;
}

export interface SimEvent {
  id: string;
  time: number;
  type: ProtocolType;
  packet: Packet;
  srcNodeId: string;
  dstNodeId: string;
}

export interface AnimatedPacket {
  id: string;
  packet: Packet;
  fromNodeId: string;
  toNodeId: string;
  edgeId: string;
  progress: number; // 0 → 1
  startTime: number;
  duration: number;
}

export type SimState = 'idle' | 'running' | 'paused' | 'stepping';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export const DEVICE_DEFAULTS: Record<DeviceType, { label: string; color: string; icon: string }> = {
  host:        { label: 'Host',       color: '#3B82F6', icon: '💻' },
  switch:      { label: 'Switch',     color: '#10B981', icon: '🔀' },
  router:      { label: 'Router',     color: '#F59E0B', icon: '🌐' },
  'dns-server': { label: 'DNS Server', color: '#8B5CF6', icon: '📋' },
  'web-server': { label: 'Web Server', color: '#EF4444', icon: '🖥️' },
};
