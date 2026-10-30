import type { NetworkNode, SimEvent, Packet } from '../../types/network';
import { generateId } from '../../utils/mac';

export interface HttpResult {
  newEvents: SimEvent[];
  animations: Array<{ fromNodeId: string; toNodeId: string; packet: Packet }>;
  logs: string[];
}

export function handleHttpRequest(
  event: SimEvent,
  nodes: NetworkNode[],
  currentTime: number,
): HttpResult {
  const result: HttpResult = { newEvents: [], animations: [], logs: [] };
  const srcNode = nodes.find((n) => n.id === event.srcNodeId);
  const dstNode = nodes.find((n) => n.id === event.dstNodeId);
  if (!srcNode || !dstNode) return result;

  result.logs.push(
    `[HTTP] ${srcNode.label} → ${dstNode.label}: GET ${event.packet.payload ?? '/'}`
  );

  result.animations.push({
    fromNodeId: srcNode.id,
    toNodeId: dstNode.id,
    packet: event.packet,
  });

  const responsePacket: Packet = {
    id: generateId(),
    srcMac: event.packet.dstMac,
    dstMac: event.packet.srcMac,
    srcIp: event.packet.dstIp,
    dstIp: event.packet.srcIp,
    protocol: 'http-response',
    ttl: 64,
    payload: '200 OK',
  };

  result.newEvents.push({
    id: generateId(),
    time: currentTime + 1,
    type: 'http-response',
    packet: responsePacket,
    srcNodeId: dstNode.id,
    dstNodeId: srcNode.id,
  });

  return result;
}

export function handleHttpResponse(
  event: SimEvent,
  nodes: NetworkNode[],
): HttpResult {
  const result: HttpResult = { newEvents: [], animations: [], logs: [] };
  const srcNode = nodes.find((n) => n.id === event.srcNodeId);
  const dstNode = nodes.find((n) => n.id === event.dstNodeId);
  if (!srcNode || !dstNode) return result;

  result.logs.push(
    `[HTTP] ${srcNode.label} → ${dstNode.label}: ${event.packet.payload ?? 'Response'}`
  );

  result.animations.push({
    fromNodeId: srcNode.id,
    toNodeId: dstNode.id,
    packet: event.packet,
  });

  return result;
}
