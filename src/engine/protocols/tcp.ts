import type { NetworkNode, SimEvent, Packet, TcpState } from '../../types/network';
import { generateId } from '../../utils/mac';

export interface TcpResult {
  stateMutations: Array<{ nodeId: string; tcpState: TcpState }>;
  newEvents: SimEvent[];
  animations: Array<{ fromNodeId: string; toNodeId: string; packet: Packet }>;
  logs: string[];
}

export function handleTcpSyn(
  event: SimEvent,
  nodes: NetworkNode[],
  currentTime: number,
): TcpResult {
  const result: TcpResult = { stateMutations: [], newEvents: [], animations: [], logs: [] };
  const srcNode = nodes.find((n) => n.id === event.srcNodeId);
  const dstNode = nodes.find((n) => n.id === event.dstNodeId);
  if (!srcNode || !dstNode) return result;

  result.logs.push(`[TCP] ${srcNode.label} → ${dstNode.label}: SYN`);
  result.stateMutations.push({ nodeId: srcNode.id, tcpState: 'SYN-SENT' });

  result.animations.push({
    fromNodeId: srcNode.id,
    toNodeId: dstNode.id,
    packet: event.packet,
  });

  // Server responds with SYN-ACK
  const synAckPacket: Packet = {
    id: generateId(),
    srcMac: event.packet.dstMac,
    dstMac: event.packet.srcMac,
    srcIp: event.packet.dstIp,
    dstIp: event.packet.srcIp,
    protocol: 'tcp-syn-ack',
    ttl: 64,
  };

  result.newEvents.push({
    id: generateId(),
    time: currentTime + 1,
    type: 'tcp-syn-ack',
    packet: synAckPacket,
    srcNodeId: dstNode.id,
    dstNodeId: srcNode.id,
  });

  return result;
}

export function handleTcpSynAck(
  event: SimEvent,
  nodes: NetworkNode[],
  currentTime: number,
): TcpResult {
  const result: TcpResult = { stateMutations: [], newEvents: [], animations: [], logs: [] };
  const srcNode = nodes.find((n) => n.id === event.srcNodeId);
  const dstNode = nodes.find((n) => n.id === event.dstNodeId);
  if (!srcNode || !dstNode) return result;

  result.logs.push(`[TCP] ${srcNode.label} → ${dstNode.label}: SYN-ACK`);
  result.stateMutations.push({ nodeId: srcNode.id, tcpState: 'SYN-RECEIVED' });

  result.animations.push({
    fromNodeId: srcNode.id,
    toNodeId: dstNode.id,
    packet: event.packet,
  });

  // Client responds with ACK
  const ackPacket: Packet = {
    id: generateId(),
    srcMac: event.packet.dstMac,
    dstMac: event.packet.srcMac,
    srcIp: event.packet.dstIp,
    dstIp: event.packet.srcIp,
    protocol: 'tcp-ack',
    ttl: 64,
  };

  result.newEvents.push({
    id: generateId(),
    time: currentTime + 1,
    type: 'tcp-ack',
    packet: ackPacket,
    srcNodeId: dstNode.id,
    dstNodeId: srcNode.id,
  });

  return result;
}

export function handleTcpAck(
  event: SimEvent,
  nodes: NetworkNode[],
): TcpResult {
  const result: TcpResult = { stateMutations: [], newEvents: [], animations: [], logs: [] };
  const srcNode = nodes.find((n) => n.id === event.srcNodeId);
  const dstNode = nodes.find((n) => n.id === event.dstNodeId);
  if (!srcNode || !dstNode) return result;

  result.logs.push(`[TCP] ${srcNode.label} → ${dstNode.label}: ACK — Connection ESTABLISHED`);
  result.stateMutations.push(
    { nodeId: srcNode.id, tcpState: 'ESTABLISHED' },
    { nodeId: dstNode.id, tcpState: 'ESTABLISHED' },
  );

  result.animations.push({
    fromNodeId: srcNode.id,
    toNodeId: dstNode.id,
    packet: event.packet,
  });

  return result;
}
