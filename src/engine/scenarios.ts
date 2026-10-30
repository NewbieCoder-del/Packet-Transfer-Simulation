import type { NetworkNode, SimEvent, Packet } from '../types/network';
import { generateId } from '../utils/mac';

export type ScenarioType = 'ping' | 'http-request' | 'dns-lookup';

export interface Scenario {
  id: ScenarioType;
  label: string;
  description: string;
}

export const SCENARIOS: Scenario[] = [
  { id: 'ping', label: 'Ping', description: 'ICMP Echo Request/Reply (ARP → Ping)' },
  { id: 'http-request', label: 'HTTP Request', description: 'ARP → TCP 3-Way Handshake → HTTP' },
  { id: 'dns-lookup', label: 'DNS Lookup', description: 'DNS Query → Response' },
];

export function createPingScenario(
  srcNode: NetworkNode,
  dstNode: NetworkNode,
): SimEvent[] {
  const srcIface = srcNode.interfaces[0];
  const dstIface = dstNode.interfaces[0];
  if (!srcIface?.ip || !dstIface?.ip) return [];

  const events: SimEvent[] = [];

  // Step 1: ARP Request (broadcast to find dstNode's MAC)
  const arpPacket: Packet = {
    id: generateId(),
    srcMac: srcIface.mac,
    dstMac: 'FF:FF:FF:FF:FF:FF',
    srcIp: srcIface.ip,
    dstIp: dstIface.ip,
    protocol: 'arp-request',
    ttl: 1,
    payload: `Who has ${dstIface.ip}?`,
  };

  events.push({
    id: generateId(),
    time: 0,
    type: 'arp-request',
    packet: arpPacket,
    srcNodeId: srcNode.id,
    dstNodeId: dstNode.id,
  });

  // Step 2: ICMP Echo (will be triggered after ARP completes - enqueue with delay)
  const icmpPacket: Packet = {
    id: generateId(),
    srcMac: srcIface.mac,
    dstMac: dstIface.mac,
    srcIp: srcIface.ip,
    dstIp: dstIface.ip,
    protocol: 'icmp-echo',
    ttl: 64,
    payload: 'Ping',
  };

  events.push({
    id: generateId(),
    time: 3,
    type: 'icmp-echo',
    packet: icmpPacket,
    srcNodeId: srcNode.id,
    dstNodeId: dstNode.id,
  });

  return events;
}

export function createHttpScenario(
  srcNode: NetworkNode,
  dstNode: NetworkNode,
): SimEvent[] {
  const srcIface = srcNode.interfaces[0];
  const dstIface = dstNode.interfaces[0];
  if (!srcIface?.ip || !dstIface?.ip) return [];

  const events: SimEvent[] = [];

  // ARP
  events.push({
    id: generateId(),
    time: 0,
    type: 'arp-request',
    packet: {
      id: generateId(),
      srcMac: srcIface.mac,
      dstMac: 'FF:FF:FF:FF:FF:FF',
      srcIp: srcIface.ip,
      dstIp: dstIface.ip,
      protocol: 'arp-request',
      ttl: 1,
    },
    srcNodeId: srcNode.id,
    dstNodeId: dstNode.id,
  });

  // TCP SYN (after ARP)
  events.push({
    id: generateId(),
    time: 3,
    type: 'tcp-syn',
    packet: {
      id: generateId(),
      srcMac: srcIface.mac,
      dstMac: dstIface.mac,
      srcIp: srcIface.ip,
      dstIp: dstIface.ip,
      protocol: 'tcp-syn',
      ttl: 64,
    },
    srcNodeId: srcNode.id,
    dstNodeId: dstNode.id,
  });

  // HTTP GET (after TCP handshake)
  events.push({
    id: generateId(),
    time: 7,
    type: 'http-request',
    packet: {
      id: generateId(),
      srcMac: srcIface.mac,
      dstMac: dstIface.mac,
      srcIp: srcIface.ip,
      dstIp: dstIface.ip,
      protocol: 'http-request',
      ttl: 64,
      payload: 'GET /',
    },
    srcNodeId: srcNode.id,
    dstNodeId: dstNode.id,
  });

  return events;
}

export function createDnsScenario(
  srcNode: NetworkNode,
  dnsServer: NetworkNode,
): SimEvent[] {
  const srcIface = srcNode.interfaces[0];
  const dnsIface = dnsServer.interfaces[0];
  if (!srcIface?.ip || !dnsIface?.ip) return [];

  return [{
    id: generateId(),
    time: 0,
    type: 'dns-query',
    packet: {
      id: generateId(),
      srcMac: srcIface.mac,
      dstMac: dnsIface.mac,
      srcIp: srcIface.ip,
      dstIp: dnsIface.ip,
      protocol: 'dns-query',
      ttl: 64,
      payload: 'www.example.com',
    },
    srcNodeId: srcNode.id,
    dstNodeId: dnsServer.id,
  }];
}
