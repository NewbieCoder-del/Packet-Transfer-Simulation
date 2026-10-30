import type { NetworkNode, SimEvent, Packet } from '../../types/network';
import { generateId } from '../../utils/mac';

export interface IcmpResult {
  newEvents: SimEvent[];
  animations: Array<{ fromNodeId: string; toNodeId: string; packet: Packet }>;
  logs: string[];
}

export function handleIcmpEcho(
  event: SimEvent,
  nodes: NetworkNode[],
  currentTime: number,
): IcmpResult {
  const result: IcmpResult = { newEvents: [], animations: [], logs: [] };
  const srcNode = nodes.find((n) => n.id === event.srcNodeId);
  const dstNode = nodes.find((n) => n.id === event.dstNodeId);
  if (!srcNode || !dstNode) return result;

  result.logs.push(
    `[ICMP] ${srcNode.label} → ${dstNode.label}: Echo Request (ping)`
  );

  result.animations.push({
    fromNodeId: srcNode.id,
    toNodeId: dstNode.id,
    packet: event.packet,
  });

  // Generate reply
  const replyPacket: Packet = {
    id: generateId(),
    srcMac: event.packet.dstMac,
    dstMac: event.packet.srcMac,
    srcIp: event.packet.dstIp,
    dstIp: event.packet.srcIp,
    protocol: 'icmp-reply',
    ttl: 64,
    payload: 'Pong',
  };

  result.newEvents.push({
    id: generateId(),
    time: currentTime + 2,
    type: 'icmp-reply',
    packet: replyPacket,
    srcNodeId: dstNode.id,
    dstNodeId: srcNode.id,
  });

  return result;
}

export function handleIcmpReply(
  event: SimEvent,
  nodes: NetworkNode[],
): IcmpResult {
  const result: IcmpResult = { newEvents: [], animations: [], logs: [] };
  const srcNode = nodes.find((n) => n.id === event.srcNodeId);
  const dstNode = nodes.find((n) => n.id === event.dstNodeId);
  if (!srcNode || !dstNode) return result;

  result.logs.push(
    `[ICMP] ${srcNode.label} → ${dstNode.label}: Echo Reply (pong)`
  );

  result.animations.push({
    fromNodeId: srcNode.id,
    toNodeId: dstNode.id,
    packet: event.packet,
  });

  return result;
}
