export type DeviceType = 'host' | 'switch' | 'router' | 'dns-server' | 'web-server';

export interface NetworkInterface {
  id: string;
  /** Human-readable port name, e.g. "FastEthernet0/1" or "GigabitEthernet0/0". */
  name: string;
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

/** A learned switch entry: MAC → the port it was seen on. */
export interface MacTableEntry {
  mac: string;
  interfaceId: string;
  tick: number;
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
  /** Layer-2 forwarding table (switch only): MAC → port it was learned on. */
  macTable?: Record<string, MacTableEntry>;
  routingTable?: RoutingEntry[];
  /** Default gateway IP for end devices; required to reach other subnets. */
  gateway?: string;
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
  | 'tcp-syn' | 'tcp-syn-ack' | 'tcp-ack'
  | 'udp-datagram' | 'udp-reply'
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
  /** Layer-4 ports, carried by UDP and TCP payloads. */
  srcPort?: number;
  dstPort?: number;
}

interface SimEventBase {
  id: string;
  time: number;
  /** Device that currently holds the frame and will emit it next. */
  srcNodeId: string;
  /** Device that must ultimately process this PDU. */
  dstNodeId: string;
  /** Device that created the PDU. */
  originNodeId: string;
  /** Devices the frame has already crossed; guards flooded traffic against loops. */
  path: string[];
}

/** A PDU being sent by, or delivered to, an end device. */
export interface ProtocolEvent extends SimEventBase {
  kind: 'protocol';
  type: ProtocolType;
  packet: Packet;
  /** PDU waiting on this exchange's resolution; passed to the reply and released when it lands. */
  pending?: SimEvent;
  /** PDU the protocol releases when its own exchange completes, e.g. HTTP GET after a handshake. */
  followUp?: SimEvent;
}

/** The same PDU as an intermediate device must relay it, hop by hop. */
export interface ForwardEvent extends SimEventBase {
  kind: 'forward';
  /** Reconstructed at the destination so the protocol layer handles it there. */
  resume: ProtocolEvent;
  /** Layer-2 header for the next hop; routers rewrite it, switches do not. */
  frame: { srcMac: string; dstMac: string };
  /** Port the frame arrived on; switches learn the source from it. */
  ingressInterfaceId?: string;
}

export type SimEvent = ProtocolEvent | ForwardEvent;

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

export type DeviceCategory = 'end' | 'infrastructure' | 'service';

export interface DeviceMeta {
  label: string;
  /** Secondary line in the device library, e.g. "End device". */
  blurb: string;
  color: string;
  category: DeviceCategory;
  /** Interface naming prefix for this device's built-in ports. */
  portPrefix: string;
  /** Number of built-in ports the device is created with. */
  portCount: number;
  /** Whether the built-in ports carry an IPv4 address. */
  layer3: boolean;
}

export const DEVICE_DEFAULTS: Record<DeviceType, DeviceMeta> = {
  host:         { label: 'Host',        blurb: 'End device',    color: '#3B82F6', category: 'end',            portPrefix: 'Ethernet',          portCount: 1, layer3: true },
  'web-server': { label: 'Web Server',  blurb: 'HTTP service',  color: '#EF4444', category: 'end',            portPrefix: 'Ethernet',          portCount: 1, layer3: true },
  switch:       { label: 'Switch',      blurb: 'Layer 2',       color: '#10B981', category: 'infrastructure', portPrefix: 'FastEthernet0/',  portCount: 4, layer3: false },
  router:       { label: 'Router',      blurb: 'Layer 3',       color: '#F59E0B', category: 'infrastructure', portPrefix: 'GigabitEthernet0/', portCount: 2, layer3: true },
  'dns-server': { label: 'DNS Server',  blurb: 'Name service',  color: '#8B5CF6', category: 'service',        portPrefix: 'Ethernet',          portCount: 1, layer3: true },
};

export const DEVICE_ORDER: DeviceType[] = ['host', 'web-server', 'switch', 'router', 'dns-server'];

export const PROTOCOL_COLORS: Record<ProtocolType, string> = {
  'arp-request': 'var(--proto-arp)',
  'arp-reply': 'var(--proto-arp)',
  'icmp-echo': 'var(--proto-icmp)',
  'icmp-reply': 'var(--proto-icmp)',
  'tcp-syn': 'var(--proto-tcp)',
  'tcp-syn-ack': 'var(--proto-tcp)',
  'tcp-ack': 'var(--proto-tcp)',
  'udp-datagram': 'var(--proto-udp)',
  'udp-reply': 'var(--proto-udp)',
  'dns-query': 'var(--proto-dns)',
  'dns-response': 'var(--proto-dns)',
  'http-request': 'var(--proto-http)',
  'http-response': 'var(--proto-http)',
};

export const PROTOCOL_SHORT_LABEL: Record<ProtocolType, string> = {
  'arp-request': 'ARP?',
  'arp-reply': 'ARP!',
  'icmp-echo': 'PING',
  'icmp-reply': 'PONG',
  'tcp-syn': 'SYN',
  'tcp-syn-ack': 'SYN/ACK',
  'tcp-ack': 'ACK',
  'udp-datagram': 'UDP',
  'udp-reply': 'UDP!',
  'dns-query': 'DNS?',
  'dns-response': 'DNS!',
  'http-request': 'GET',
  'http-response': 'HTTP',
};
