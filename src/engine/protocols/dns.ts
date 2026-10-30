import type { NetworkNode, SimEvent, Packet } from '../../types/network';
import { generateId } from '../../utils/mac';

export interface DnsResult {
  newEvents: SimEvent[];
  animations: Array<{ fromNodeId: string; toNodeId: string; packet: Packet }>;
  logs: string[];
}

export function handleDnsQuery(
  event: SimEvent,
  nodes: NetworkNode[],
  currentTime: number,
): DnsResult {
  const result: DnsResult = { newEvents: [], animations: [], logs: [] };
  const srcNode = nodes.find((n) => n.id === event.srcNodeId);
  const dstNode = nodes.find((n) => n.id === event.dstNodeId);
  if (!srcNode || !dstNode) return result;

  const hostname = event.packet.payload ?? 'unknown';
  result.logs.push(`[DNS] ${srcNode.label} → ${dstNode.label}: Query "${hostname}"`);

  result.animations.push({
    fromNodeId: srcNode.id,
    toNodeId: dstNode.id,
    packet: event.packet,
  });

  // Find the web server IP to resolve to
  const webServer = nodes.find((n) => n.type === 'web-server');
  const resolvedIp = webServer?.interfaces[0]?.ip ?? '0.0.0.0';

  const responsePacket: Packet = {
    id: generateId(),
    srcMac: event.packet.dstMac,
    dstMac: event.packet.srcMac,
    srcIp: event.packet.dstIp,
    dstIp: event.packet.srcIp,
    protocol: 'dns-response',
    ttl: 64,
    payload: `${hostname} → ${resolvedIp}`,
  };

  result.newEvents.push({
    id: generateId(),
    time: currentTime + 1,
    type: 'dns-response',
    packet: responsePacket,
    srcNodeId: dstNode.id,
    dstNodeId: srcNode.id,
  });

  return result;
}

export function handleDnsResponse(
  event: SimEvent,
  nodes: NetworkNode[],
): DnsResult {
  const result: DnsResult = { newEvents: [], animations: [], logs: [] };
  const srcNode = nodes.find((n) => n.id === event.srcNodeId);
  const dstNode = nodes.find((n) => n.id === event.dstNodeId);
  if (!srcNode || !dstNode) return result;

  result.logs.push(
    `[DNS] ${srcNode.label} → ${dstNode.label}: Response "${event.packet.payload}"`
  );

  result.animations.push({
    fromNodeId: srcNode.id,
    toNodeId: dstNode.id,
    packet: event.packet,
  });

  return result;
}
