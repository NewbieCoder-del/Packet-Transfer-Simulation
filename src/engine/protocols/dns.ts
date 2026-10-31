import type { NetworkNode, NetworkEdge, ProtocolEvent } from '../../types/network';
import type { EngineOutcome } from '../forwarding';
import { deviceWithIp, pdu, replyOf } from '../forwarding';

const DNS_PORT = 53;

export function dnsOnSend(
  event: ProtocolEvent,
  sender: NetworkNode,
  nodes: NetworkNode[],
  _edges: NetworkEdge[],
  out: EngineOutcome
): void {
  const target = deviceWithIp(event.packet.dstIp, nodes);
  const label =
    event.type === 'dns-query'
      ? `Query "${event.packet.payload ?? 'unknown'}"`
      : `Response "${event.packet.payload ?? ''}"`;
  out.logs.push({
    text: `[DNS] ${sender.label} → ${target?.label ?? event.packet.dstIp}: ${label} (UDP ${
      event.packet.srcPort ?? '?'
    } → ${event.packet.dstPort ?? DNS_PORT})`,
    nodeId: sender.id,
    packet: event.packet,
  });
}

/** The server answers from the records it can actually see: the web servers in this topology. */
export function dnsOnReceive(
  event: ProtocolEvent,
  holder: NetworkNode,
  nodes: NetworkNode[],
  _edges: NetworkEdge[],
  out: EngineOutcome
): void {
  if (event.type === 'dns-response') {
    const peer = deviceWithIp(event.packet.srcIp, nodes);
    out.logs.push({
      text: `[DNS] ${holder.label} received answer: ${event.packet.payload ?? 'empty'} from ${
        peer?.label ?? event.packet.srcIp
      }`,
      nodeId: holder.id,
      packet: event.packet,
    });
    return;
  }

  const hostname = event.packet.payload ?? 'unknown';
  const webServer = nodes.find((n) => n.type === 'web-server');
  const resolvedIp = webServer?.interfaces.find((iface) => iface.ip)?.ip;
  const answer = resolvedIp ? `${hostname} → ${resolvedIp}` : `${hostname}: no A record in this topology`;

  out.newEvents.push(
    pdu({
      type: 'dns-response',
      packet: replyOf(event, holder, {
        type: 'dns-response',
        payload: answer,
        srcPort: DNS_PORT,
        dstPort: event.packet.dstPort ?? 1024,
      }),
      holder,
      nodes,
      time: event.time + 1,
    })
  );
}
