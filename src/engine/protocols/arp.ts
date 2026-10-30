import type { NetworkNode, SimEvent, Packet } from '../../types/network';
import { generateId } from '../../utils/mac';

export interface ArpResult {
  stateMutations: Array<{ nodeId: string; arpEntry: { ip: string; mac: string } }>;
  newEvents: SimEvent[];
  animations: Array<{ fromNodeId: string; toNodeId: string; packet: Packet }>;
  logs: string[];
}

export function handleArpRequest(
  event: SimEvent,
  nodes: NetworkNode[],
  findEdgePath: (fromId: string, toId: string) => string | null,
  currentTime: number,
): ArpResult {
  const result: ArpResult = { stateMutations: [], newEvents: [], animations: [], logs: [] };
  const srcNode = nodes.find((n) => n.id === event.srcNodeId);
  if (!srcNode) return result;

  const targetIp = event.packet.dstIp;
  result.logs.push(
    `[ARP] ${srcNode.label} broadcasts: Who has ${targetIp}? Tell ${event.packet.srcIp}`
  );

  // Broadcast to all directly connected nodes
  const connectedNodes = nodes.filter((n) => n.id !== srcNode.id && findEdgePath(srcNode.id, n.id));

  for (const neighbor of connectedNodes) {
    result.animations.push({
      fromNodeId: srcNode.id,
      toNodeId: neighbor.id,
      packet: event.packet,
    });

    // Check if neighbor has the target IP
    const hasTargetIp = neighbor.interfaces.some((iface) => iface.ip === targetIp);
    if (hasTargetIp) {
      const replyMac = neighbor.interfaces[0]?.mac ?? 'FF:FF:FF:FF:FF:FF';
      const replyPacket: Packet = {
        id: generateId(),
        srcMac: replyMac,
        dstMac: event.packet.srcMac,
        srcIp: targetIp,
        dstIp: event.packet.srcIp,
        protocol: 'arp-reply',
        ttl: 64,
        payload: `MAC=${replyMac}`,
      };

      result.newEvents.push({
        id: generateId(),
        time: currentTime + 1,
        type: 'arp-reply',
        packet: replyPacket,
        srcNodeId: neighbor.id,
        dstNodeId: srcNode.id,
      });
    }
  }

  return result;
}

export function handleArpReply(
  event: SimEvent,
  nodes: NetworkNode[],
): ArpResult {
  const result: ArpResult = { stateMutations: [], newEvents: [], animations: [], logs: [] };
  const dstNode = nodes.find((n) => n.id === event.dstNodeId);
  const srcNode = nodes.find((n) => n.id === event.srcNodeId);
  if (!dstNode || !srcNode) return result;

  result.logs.push(
    `[ARP] ${srcNode.label} replies to ${dstNode.label}: ${event.packet.srcIp} is at ${event.packet.srcMac}`
  );

  result.stateMutations.push({
    nodeId: dstNode.id,
    arpEntry: { ip: event.packet.srcIp, mac: event.packet.srcMac },
  });

  result.animations.push({
    fromNodeId: srcNode.id,
    toNodeId: dstNode.id,
    packet: event.packet,
  });

  return result;
}
