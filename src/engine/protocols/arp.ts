import type { NetworkNode, NetworkEdge, ProtocolEvent } from '../../types/network';
import type { EngineOutcome } from '../forwarding';
import { deviceWithIp, pdu, replyOf } from '../forwarding';
import { generateId } from '../../utils/mac';

export function arpOnSend(
  event: ProtocolEvent,
  sender: NetworkNode,
  nodes: NetworkNode[],
  _edges: NetworkEdge[],
  out: EngineOutcome
): void {
  if (event.type === 'arp-request') {
    out.logs.push({
      text: `[ARP] ${sender.label} broadcasts: Who has ${event.packet.dstIp}? Tell ${event.packet.srcIp}`,
      nodeId: sender.id,
      packet: event.packet,
    });
    return;
  }
  const target = deviceWithIp(event.packet.dstIp, nodes);
  out.logs.push({
    text: `[ARP] ${sender.label} replies to ${target?.label ?? event.packet.dstIp}: ${event.packet.srcIp} is at ${event.packet.srcMac}`,
    nodeId: sender.id,
    packet: event.packet,
  });
}

export function arpOnReceive(
  event: ProtocolEvent,
  holder: NetworkNode,
  nodes: NetworkNode[],
  _edges: NetworkEdge[],
  out: EngineOutcome
): void {
  if (event.type === 'arp-request') {
    const reply = replyOf(event, holder, { type: 'arp-reply', ttl: 1 });
    out.newEvents.push(
      pdu({
        type: 'arp-reply',
        packet: { ...reply, payload: `${reply.srcIp} is at ${reply.srcMac}` },
        holder,
        nodes,
        time: event.time + 1,
        pending: event.pending,
      })
    );
    return;
  }

  out.arpMutations.push({ nodeId: holder.id, ip: event.packet.srcIp, mac: event.packet.srcMac });
  out.logs.push({
    text: `[ARP] ${holder.label} cached ${event.packet.srcIp} → ${event.packet.srcMac}`,
    nodeId: holder.id,
    packet: event.packet,
  });

  // Release the PDU that was waiting on this resolution; it is held by the device we just cached for.
  if (event.pending && event.pending.kind === 'protocol') {
    out.newEvents.push({ ...event.pending, id: generateId(), time: event.time + 1 });
  }
}
