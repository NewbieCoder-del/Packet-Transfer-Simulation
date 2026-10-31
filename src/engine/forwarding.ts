/** Layer-2/Layer-3 forwarding primitives: next-hop resolution, switching and routing. */
import type {
  NetworkNode,
  NetworkEdge,
  NetworkInterface,
  Packet,
  ProtocolEvent,
  ForwardEvent,
  SimEvent,
  MacTableEntry,
  TcpState,
} from '../types/network';
import { isSameSubnet } from '../utils/ip';
import { generateId } from '../utils/mac';
import { findPath } from './routing';

export const BROADCAST_MAC = 'FF:FF:FF:FF:FF:FF';

export interface EngineLog {
  text: string;
  packet?: Packet;
  nodeId?: string;
}

export interface EngineOutcome {
  animations: Array<{ fromNodeId: string; toNodeId: string; packet: Packet }>;
  newEvents: SimEvent[];
  arpMutations: Array<{ nodeId: string; ip: string; mac: string }>;
  macMutations: Array<{ nodeId: string; entry: MacTableEntry }>;
  tcpMutations: Array<{ nodeId: string; tcpState: TcpState }>;
  logs: EngineLog[];
}

export function outcome(): EngineOutcome {
  return {
    animations: [],
    newEvents: [],
    arpMutations: [],
    macMutations: [],
    tcpMutations: [],
    logs: [],
  };
}

export interface Link {
  edgeId: string;
  localInterfaceId: string;
  peerNodeId: string;
  peerInterfaceId: string;
  up: boolean;
}

export function linksOf(nodeId: string, edges: NetworkEdge[]): Link[] {
  const links: Link[] = [];
  for (const edge of edges) {
    if (edge.from.nodeId === nodeId) {
      links.push({
        edgeId: edge.id,
        localInterfaceId: edge.from.interfaceId,
        peerNodeId: edge.to.nodeId,
        peerInterfaceId: edge.to.interfaceId,
        up: edge.status === 'up',
      });
    } else if (edge.to.nodeId === nodeId) {
      links.push({
        edgeId: edge.id,
        localInterfaceId: edge.to.interfaceId,
        peerNodeId: edge.from.nodeId,
        peerInterfaceId: edge.from.interfaceId,
        up: edge.status === 'up',
      });
    }
  }
  return links;
}

export function interfaceOf(node: NetworkNode, interfaceId?: string): NetworkInterface | undefined {
  return node.interfaces.find((iface) => iface.id === interfaceId);
}

export function interfaceWithIp(node: NetworkNode, ip: string): NetworkInterface | undefined {
  return node.interfaces.find((iface) => iface.ip === ip);
}

export function deviceWithIp(ip: string, nodes: NetworkNode[]): NetworkNode | undefined {
  return nodes.find((n) => n.interfaces.some((iface) => iface.ip === ip));
}

export function isForDevice(node: NetworkNode, ip: string): boolean {
  return node.interfaces.some((iface) => iface.ip === ip);
}

/** Interfaces that are configured and carry an operational link. */
function liveInterfaces(node: NetworkNode, edges: NetworkEdge[]): NetworkInterface[] {
  const links = linksOf(node.id, edges);
  return node.interfaces.filter(
    (iface) =>
      !!iface.ip && !!iface.subnetMask && links.some((l) => l.up && l.localInterfaceId === iface.id)
  );
}

/**
 * The IP the frame must be addressed to next: the destination itself when it sits on a
 * connected subnet, otherwise the configured default gateway.
 */
export function resolveNextIp(
  node: NetworkNode,
  dstIp: string,
  edges: NetworkEdge[]
): { nextIp: string; interfaceId: string } | { error: string } {
  const configured = node.interfaces.filter((iface) => iface.ip && iface.subnetMask);
  const sameNetwork = configured.filter((iface) => isSameSubnet(iface.ip!, dstIp, iface.subnetMask!));
  const live = linksOf(node.id, edges);
  const up = sameNetwork.find((iface) => live.some((l) => l.up && l.localInterfaceId === iface.id));
  if (up) return { nextIp: dstIp, interfaceId: up.id };
  if (sameNetwork.length > 0) {
    return { error: `${node.label}: ${sameNetwork[0].name} owns that network but has no link up` };
  }

  if (!node.gateway) {
    return {
      error:
        node.type === 'router'
          ? `${node.label} has no route to ${dstIp} — add a static or default route`
          : `${node.label} has no route to ${dstIp} and no default gateway set`,
    };
  }
  const candidates = liveInterfaces(node, edges);
  const egress =
    candidates.find((iface) => isSameSubnet(iface.ip!, node.gateway!, iface.subnetMask!)) ?? candidates[0];
  if (!egress) return { error: `${node.label} has no operational interface` };
  return { nextIp: node.gateway, interfaceId: egress.id };
}

/** Routing decision on a router: directly connected subnets first, then static entries. */
export function routeLookup(
  router: NetworkNode,
  dstIp: string,
  edges: NetworkEdge[]
): { nextIp: string; interfaceId: string; via: string } | { error: string } {
  const connected = liveInterfaces(router, edges).find((iface) =>
    isSameSubnet(iface.ip!, dstIp, iface.subnetMask!)
  );
  if (connected) return { nextIp: dstIp, interfaceId: connected.id, via: connected.name };

  const route = (router.routingTable ?? []).find((entry) => isSameSubnet(entry.destination, dstIp, entry.mask));
  if (route) {
    const iface = interfaceOf(router, route.interfaceId);
    if (!iface) return { error: `${router.label}: static route points at a missing interface` };
    return { nextIp: route.gateway, interfaceId: route.interfaceId, via: iface.name };
  }

  return { error: `${router.label}: no route to ${dstIp}` };
}

/** First device along the shortest operational path toward `targetId`, preferring `viaInterfaceId`. */
export function firstHopToward(
  fromId: string,
  targetId: string,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  viaInterfaceId?: string
): Link | undefined {
  if (fromId === targetId) return undefined;
  const links = linksOf(fromId, edges).filter(
    (l) => l.up && (!viaInterfaceId || l.localInterfaceId === viaInterfaceId)
  );
  const direct = links.find((l) => l.peerNodeId === targetId);
  if (direct) return direct;
  const path = findPath(fromId, targetId, nodes, edges);
  if (!path || path.length < 2) return undefined;
  return links.find((l) => l.peerNodeId === path[1]);
}

export function arpCache(node: NetworkNode, ip: string): string | undefined {
  return node.arpTable[ip];
}

export function findDevice(nodeId: string, nodes: NetworkNode[]): NetworkNode | undefined {
  return nodes.find((n) => n.id === nodeId);
}

/** The frame exactly as it appears on the wire for the next hop. */
export function wirePacket(event: ForwardEvent): Packet {
  return { ...event.resume.packet, srcMac: event.frame.srcMac, dstMac: event.frame.dstMac };
}

/**
 * Origin-side transmission. Resolves the next hop from the sender's own configuration, starts
 * an ARP resolution when that hop's MAC is still unknown, and otherwise puts one hop on the wire.
 * Returns the event as it went out so the caller can log the protocol-level description.
 */
export function sendFromOrigin(
  sender: NetworkNode,
  event: ProtocolEvent,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  out: EngineOutcome
): ProtocolEvent | undefined {
  const decision = resolveNextIp(sender, event.packet.dstIp, edges);
  if ('error' in decision) {
    out.logs.push({ text: `[L3] ${decision.error}`, nodeId: sender.id, packet: event.packet });
    return undefined;
  }

  const nextDevice = deviceWithIp(decision.nextIp, nodes);
  if (!nextDevice) {
    out.logs.push({
      text: `[L3] ${sender.label}: next hop ${decision.nextIp} is not present`,
      nodeId: sender.id,
      packet: event.packet,
    });
    return undefined;
  }

  const link =
    firstHopToward(sender.id, nextDevice.id, nodes, edges, decision.interfaceId) ??
    firstHopToward(sender.id, nextDevice.id, nodes, edges);
  if (!link) {
    out.logs.push({
      text: `[L2] ${sender.label}: no operational link toward ${nextDevice.label}`,
      nodeId: sender.id,
      packet: event.packet,
    });
    return undefined;
  }

  const isArpExchange = event.type === 'arp-request' || event.type === 'arp-reply';
  const egress = interfaceOf(sender, decision.interfaceId);
  const peer = findDevice(link.peerNodeId, nodes);
  if (!peer) return undefined;

  if (!isArpExchange && !arpCache(sender, decision.nextIp)) {
    const waiting: ProtocolEvent = {
      ...event,
      id: generateId(),
      srcNodeId: sender.id,
      dstNodeId: nextDevice.id,
      path: [],
    };
    const arpPacket: Packet = {
      id: generateId(),
      srcMac: egress?.mac ?? event.packet.srcMac,
      dstMac: BROADCAST_MAC,
      srcIp: egress?.ip ?? event.packet.srcIp,
      dstIp: decision.nextIp,
      protocol: 'arp-request',
      ttl: 1,
      payload: `Who has ${decision.nextIp}?`,
    };
    out.newEvents.push({
      kind: 'protocol',
      id: generateId(),
      time: event.time,
      type: 'arp-request',
      srcNodeId: sender.id,
      dstNodeId: nextDevice.id,
      originNodeId: sender.id,
      path: [],
      packet: arpPacket,
      pending: waiting,
    });
    return undefined;
  }

  const dstMac = isArpExchange ? event.packet.dstMac : (arpCache(sender, decision.nextIp) ?? BROADCAST_MAC);
  const resolved: ProtocolEvent = {
    ...event,
    dstNodeId: nextDevice.id,
    packet: { ...event.packet, dstMac },
  };
  // The frame goes to the neighbour on the wire, which may be a hub, a router or the destination itself.
  deliverHop(
    sender,
    peer,
    link,
    resolved,
    { srcMac: egress?.mac ?? resolved.packet.srcMac, dstMac },
    [sender.id],
    out
  );
  return resolved;
}

/** Rebuild the protocol event at the device that must finally act on it. */
export function arrivalOf(event: ProtocolEvent, deviceId: string, time: number): ProtocolEvent {
  return { ...event, id: generateId(), time, srcNodeId: deviceId, path: [] };
}

export function forwardOf(args: {
  resume: ProtocolEvent;
  nextNodeId: string;
  nextInterfaceId: string;
  frame: { srcMac: string; dstMac: string };
  path: string[];
  time: number;
}): ForwardEvent {
  return {
    kind: 'forward',
    id: generateId(),
    time: args.time,
    srcNodeId: args.nextNodeId,
    dstNodeId: args.resume.dstNodeId,
    originNodeId: args.resume.originNodeId,
    path: args.path,
    resume: args.resume,
    frame: args.frame,
    ingressInterfaceId: args.nextInterfaceId,
  };
}

/** Build the protocol event a device emits, addressed toward the PDU's destination IP owner. */
export function pdu(args: {
  type: ProtocolEvent['type'];
  packet: Packet;
  holder: NetworkNode;
  nodes: NetworkNode[];
  time: number;
  pending?: SimEvent;
  followUp?: SimEvent;
}): ProtocolEvent {
  const target = deviceWithIp(args.packet.dstIp, args.nodes);
  return {
    kind: 'protocol',
    id: generateId(),
    time: args.time,
    type: args.type,
    srcNodeId: args.holder.id,
    dstNodeId: target?.id ?? args.holder.id,
    originNodeId: args.holder.id,
    path: [],
    packet: args.packet,
    ...(args.pending ? { pending: args.pending } : {}),
    ...(args.followUp ? { followUp: args.followUp } : {}),
  };
}

/**
 * The reply PDU: transport addresses swapped, Layer-2 header left unresolved because
 * `sendFromOrigin` fixes it per hop once the next hop's MAC is known.
 */
export function replyOf(
  event: ProtocolEvent,
  holder: NetworkNode,
  args: {
    type: ProtocolEvent['type'];
    payload?: string;
    ttl?: number;
    srcPort?: number;
    dstPort?: number;
  }
): Packet {
  const srcIp = event.packet.dstIp;
  return {
    id: generateId(),
    srcMac: interfaceWithIp(holder, srcIp)?.mac ?? BROADCAST_MAC,
    dstMac: BROADCAST_MAC,
    srcIp,
    dstIp: event.packet.srcIp,
    protocol: args.type,
    ttl: args.ttl ?? 64,
    payload: args.payload,
    srcPort: args.srcPort,
    dstPort: args.dstPort,
  };
}

/**
 * Hand a PDU to the next device: one animated hop, then either the destination's protocol
 * stack or an intermediate relay.
 */
export function deliverHop(
  from: NetworkNode,
  to: NetworkNode,
  link: Link,
  event: ProtocolEvent,
  frame: { srcMac: string; dstMac: string },
  path: string[],
  out: EngineOutcome
): void {
  const onWire: Packet = { ...event.packet, srcMac: frame.srcMac, dstMac: frame.dstMac };
  out.animations.push({ fromNodeId: from.id, toNodeId: to.id, packet: onWire });

  if (isForDevice(to, event.packet.dstIp)) {
    out.newEvents.push(arrivalOf({ ...event, packet: onWire }, to.id, event.time + 1));
    return;
  }

  out.newEvents.push(
    forwardOf({
      resume: { ...event, packet: onWire },
      nextNodeId: to.id,
      nextInterfaceId: link.peerInterfaceId,
      frame,
      path,
      time: event.time + 1,
    })
  );
}

/**
 * A switch relays a frame: it learns the source port, then forwards from its table or floods
 * when the destination is broadcast or unknown.
 */
export function switchForward(
  sw: NetworkNode,
  event: ForwardEvent,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  out: EngineOutcome
): void {
  const links = linksOf(sw.id, edges);
  const ingress = event.ingressInterfaceId;
  const onWire = wirePacket(event);

  if (ingress && event.frame.srcMac !== BROADCAST_MAC && !sw.macTable?.[event.frame.srcMac]) {
    out.macMutations.push({ nodeId: sw.id, entry: { mac: event.frame.srcMac, interfaceId: ingress, tick: event.time } });
    out.logs.push({
      text: `[SWITCH] ${sw.label} learned ${event.frame.srcMac} on ${interfaceOf(sw, ingress)?.name ?? 'port'}`,
      nodeId: sw.id,
      packet: onWire,
    });
  }

  const learned = event.frame.dstMac === BROADCAST_MAC ? undefined : sw.macTable?.[event.frame.dstMac];
  const targets = learned
    ? links.filter((l) => l.up && l.localInterfaceId === learned.interfaceId)
    : links.filter((l) => l.up && l.localInterfaceId !== ingress);

  if (learned) {
    out.logs.push({
      text: `[SWITCH] ${sw.label} forwards ${event.frame.dstMac} to ${interfaceOf(sw, learned.interfaceId)?.name ?? 'port'}`,
      nodeId: sw.id,
      packet: onWire,
    });
  } else if (targets.length > 0) {
    out.logs.push({
      text: `[SWITCH] ${sw.label} floods ${targets.length} port(s) — ${
        event.frame.dstMac === BROADCAST_MAC ? 'broadcast' : 'unknown MAC'
      }`,
      nodeId: sw.id,
      packet: onWire,
    });
  } else {
    out.logs.push({ text: `[SWITCH] ${sw.label} dropped frame: no egress port`, nodeId: sw.id, packet: onWire });
    return;
  }

  for (const link of targets) {
    if (event.path.includes(link.peerNodeId)) continue;
    const peer = findDevice(link.peerNodeId, nodes);
    if (!peer) continue;
    deliverHop(sw, peer, link, event.resume, event.frame, [...event.path, sw.id], out);
  }
}

/**
 * A router moves a frame between broadcast domains: pick an egress interface, expire the TTL,
 * rewrite the Layer-2 header and resolve the next hop's MAC if it is not cached.
 */
export function routerForward(
  router: NetworkNode,
  event: ForwardEvent,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  out: EngineOutcome
): void {
  const incoming = event.resume.packet;
  const decision = routeLookup(router, incoming.dstIp, edges);
  if ('error' in decision) {
    out.logs.push({ text: `[ROUTE] ${decision.error}`, nodeId: router.id, packet: incoming });
    return;
  }

  const ttl = incoming.ttl - 1;
  if (ttl <= 0) {
    out.logs.push({
      text: `[ROUTE] ${router.label} dropped frame for ${incoming.dstIp}: TTL exceeded`,
      nodeId: router.id,
      packet: incoming,
    });
    return;
  }

  const egress = interfaceOf(router, decision.interfaceId);
  if (!egress) {
    out.logs.push({ text: `[ROUTE] ${router.label}: ${decision.via} is unavailable`, nodeId: router.id, packet: incoming });
    return;
  }

  const nextMac = arpCache(router, decision.nextIp);
  if (!nextMac) {
    requestArpForNextHop(router, event, egress, decision.nextIp, nodes, out);
    return;
  }

  const nextDevice = deviceWithIp(decision.nextIp, nodes);
  const hop = nextDevice ? firstHopToward(router.id, nextDevice.id, nodes, edges, egress.id) : undefined;
  const peer = hop ? findDevice(hop.peerNodeId, nodes) : undefined;
  if (!hop || !peer) {
    out.logs.push({
      text: `[ROUTE] ${router.label}: next hop ${decision.nextIp} is unreachable over ${egress.name}`,
      nodeId: router.id,
      packet: incoming,
    });
    return;
  }

  const routed: Packet = { ...incoming, ttl, srcMac: egress.mac, dstMac: nextMac };
  out.logs.push({
    text: `[ROUTE] ${router.label} forwards ${routed.srcIp} → ${routed.dstIp} out ${egress.name} (TTL ${ttl})`,
    nodeId: router.id,
    packet: routed,
  });
  deliverHop(router, peer, hop, { ...event.resume, packet: routed, srcNodeId: router.id }, { srcMac: egress.mac, dstMac: nextMac }, [...event.path, router.id], out);
}

/** The router knows which interface to use but not the next hop's MAC, so it resolves first. */
function requestArpForNextHop(
  router: NetworkNode,
  event: ForwardEvent,
  egress: NetworkInterface,
  nextIp: string,
  nodes: NetworkNode[],
  out: EngineOutcome
): void {
  const owner = deviceWithIp(nextIp, nodes);
  if (!owner) {
    out.logs.push({
      text: `[ROUTE] ${router.label}: next hop ${nextIp} is not present`,
      nodeId: router.id,
      packet: event.resume.packet,
    });
    return;
  }

  // The frame waits unresolved, TTL untouched, so the re-run decrements it exactly once for this hop.
  const waiting: ProtocolEvent = {
    ...event.resume,
    id: generateId(),
    time: event.time + 2,
    srcNodeId: router.id,
    dstNodeId: owner.id,
    path: [],
    packet: { ...event.resume.packet, dstMac: BROADCAST_MAC },
  };

  const arpPacket: Packet = {
    id: generateId(),
    srcMac: egress.mac,
    dstMac: BROADCAST_MAC,
    srcIp: egress.ip!,
    dstIp: nextIp,
    protocol: 'arp-request',
    ttl: 1,
    payload: `Who has ${nextIp}?`,
  };

  out.newEvents.push({
    kind: 'protocol',
    id: generateId(),
    time: event.time + 1,
    type: 'arp-request',
    srcNodeId: router.id,
    dstNodeId: owner.id,
    originNodeId: router.id,
    path: [],
    packet: arpPacket,
    pending: waiting,
  });
}
