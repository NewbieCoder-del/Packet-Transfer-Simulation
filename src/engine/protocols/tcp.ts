import type { NetworkNode, NetworkEdge, ProtocolEvent } from '../../types/network';
import type { EngineOutcome } from '../forwarding';
import { deviceWithIp, pdu, replyOf } from '../forwarding';
import { generateId } from '../../utils/mac';

function ports(packet: ProtocolEvent['packet']): string {
  if (packet.srcPort === undefined || packet.dstPort === undefined) return '';
  return ` (${packet.srcPort} → ${packet.dstPort})`;
}

export function tcpOnSend(
  event: ProtocolEvent,
  sender: NetworkNode,
  nodes: NetworkNode[],
  _edges: NetworkEdge[],
  out: EngineOutcome
): void {
  const target = deviceWithIp(event.packet.dstIp, nodes);
  const flag = event.type === 'tcp-syn' ? 'SYN' : event.type === 'tcp-syn-ack' ? 'SYN-ACK' : 'ACK';
  out.logs.push({
    text: `[TCP] ${sender.label} → ${target?.label ?? event.packet.dstIp}: ${flag}${ports(event.packet)}`,
    nodeId: sender.id,
    packet: event.packet,
  });

  if (event.type === 'tcp-syn') {
    out.tcpMutations.push({ nodeId: sender.id, tcpState: 'SYN-SENT' });
  }
}

export function tcpOnReceive(
  event: ProtocolEvent,
  holder: NetworkNode,
  nodes: NetworkNode[],
  _edges: NetworkEdge[],
  out: EngineOutcome
): void {
  const peer = deviceWithIp(event.packet.srcIp, nodes);
  const peerLabel = peer?.label ?? event.packet.srcIp;

  if (event.type === 'tcp-syn') {
    out.tcpMutations.push({ nodeId: holder.id, tcpState: 'SYN-RECEIVED' });
    out.newEvents.push(
      pdu({
        type: 'tcp-syn-ack',
        packet: replyOf(event, holder, {
          type: 'tcp-syn-ack',
          srcPort: event.packet.dstPort,
          dstPort: event.packet.srcPort,
        }),
        holder,
        nodes,
        time: event.time + 1,
        followUp: event.followUp,
      })
    );
    return;
  }

  if (event.type === 'tcp-syn-ack') {
    out.tcpMutations.push({ nodeId: holder.id, tcpState: 'ESTABLISHED' });
    out.logs.push({
      text: `[TCP] ${holder.label} received SYN-ACK from ${peerLabel} — connection ESTABLISHED`,
      nodeId: holder.id,
      packet: event.packet,
    });
    out.newEvents.push(
      pdu({
        type: 'tcp-ack',
        packet: replyOf(event, holder, {
          type: 'tcp-ack',
          srcPort: event.packet.dstPort,
          dstPort: event.packet.srcPort,
        }),
        holder,
        nodes,
        time: event.time + 1,
        followUp: event.followUp,
      })
    );
    return;
  }

  out.tcpMutations.push({ nodeId: holder.id, tcpState: 'ESTABLISHED' });
  out.logs.push({
    text: `[TCP] ${holder.label} received ACK from ${peerLabel} — connection ESTABLISHED`,
    nodeId: holder.id,
    packet: event.packet,
  });

  // Three-way handshake done: release whatever the session was waiting to send.
  if (event.followUp && event.followUp.kind === 'protocol') {
    out.newEvents.push({ ...event.followUp, id: generateId(), time: event.time + 1 });
  }
}
