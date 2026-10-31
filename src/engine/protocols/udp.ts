import type { NetworkNode, NetworkEdge, ProtocolEvent } from '../../types/network';
import type { EngineOutcome } from '../forwarding';
import { deviceWithIp, pdu, replyOf } from '../forwarding';

export function udpOnSend(
  event: ProtocolEvent,
  sender: NetworkNode,
  nodes: NetworkNode[],
  _edges: NetworkEdge[],
  out: EngineOutcome
): void {
  const target = deviceWithIp(event.packet.dstIp, nodes);
  const direction = event.type === 'udp-datagram' ? 'datagram' : 'reply';
  out.logs.push({
    text: `[UDP] ${sender.label} → ${target?.label ?? event.packet.dstIp}: ${direction} ${
      event.packet.srcPort ?? '?'
    } → ${event.packet.dstPort ?? '?'} (${event.packet.payload ?? 'no data'})`,
    nodeId: sender.id,
    packet: event.packet,
  });
}

/** UDP is connectionless: the listener answers the datagram, nothing more is tracked. */
export function udpOnReceive(
  event: ProtocolEvent,
  holder: NetworkNode,
  nodes: NetworkNode[],
  _edges: NetworkEdge[],
  out: EngineOutcome
): void {
  if (event.type === 'udp-reply') {
    const peer = deviceWithIp(event.packet.srcIp, nodes);
    out.logs.push({
      text: `[UDP] ${holder.label} received reply from ${peer?.label ?? event.packet.srcIp} on port ${
        event.packet.dstPort ?? '?'
      }`,
      nodeId: holder.id,
      packet: event.packet,
    });
    return;
  }

  out.newEvents.push(
    pdu({
      type: 'udp-reply',
      packet: replyOf(event, holder, {
        type: 'udp-reply',
        srcPort: event.packet.dstPort,
        dstPort: event.packet.srcPort,
        payload: event.packet.payload,
      }),
      holder,
      nodes,
      time: event.time + 1,
    })
  );
}
