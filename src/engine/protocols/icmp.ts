import type { NetworkNode, NetworkEdge, ProtocolEvent } from '../../types/network';
import type { EngineOutcome } from '../forwarding';
import { deviceWithIp, pdu, replyOf } from '../forwarding';

export function icmpOnSend(
  event: ProtocolEvent,
  sender: NetworkNode,
  nodes: NetworkNode[],
  _edges: NetworkEdge[],
  out: EngineOutcome
): void {
  const target = deviceWithIp(event.packet.dstIp, nodes);
  const kind = event.type === 'icmp-echo' ? 'Echo Request (ping)' : 'Echo Reply (pong)';
  out.logs.push({
    text: `[ICMP] ${sender.label} → ${target?.label ?? event.packet.dstIp}: ${kind}`,
    nodeId: sender.id,
    packet: event.packet,
  });
}

export function icmpOnReceive(
  event: ProtocolEvent,
  holder: NetworkNode,
  nodes: NetworkNode[],
  _edges: NetworkEdge[],
  out: EngineOutcome
): void {
  const peer = deviceWithIp(event.packet.srcIp, nodes);

  if (event.type === 'icmp-reply') {
    out.logs.push({
      text: `[ICMP] ${holder.label} received Echo Reply from ${peer?.label ?? event.packet.srcIp}`,
      nodeId: holder.id,
      packet: event.packet,
    });
    return;
  }

  out.logs.push({
    text: `[ICMP] ${holder.label} received Echo Request from ${peer?.label ?? event.packet.srcIp}`,
    nodeId: holder.id,
    packet: event.packet,
  });

  out.newEvents.push(
    pdu({
      type: 'icmp-reply',
      packet: replyOf(event, holder, { type: 'icmp-reply', payload: 'Pong' }),
      holder,
      nodes,
      time: event.time + 1,
    })
  );
}
