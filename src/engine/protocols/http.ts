import type { NetworkNode, NetworkEdge, ProtocolEvent } from '../../types/network';
import type { EngineOutcome } from '../forwarding';
import { deviceWithIp, pdu, replyOf } from '../forwarding';

const HTTP_PORT = 80;

function path(event: ProtocolEvent): string {
  return event.packet.payload ?? '/';
}

export function httpOnSend(
  event: ProtocolEvent,
  sender: NetworkNode,
  nodes: NetworkNode[],
  _edges: NetworkEdge[],
  out: EngineOutcome
): void {
  const target = deviceWithIp(event.packet.dstIp, nodes);
  const text =
    event.type === 'http-request'
      ? `GET ${path(event)}`
      : `${event.packet.payload ?? 'Response'}`;
  out.logs.push({
    text: `[HTTP] ${sender.label} → ${target?.label ?? event.packet.dstIp}: ${text} (TCP ${
      event.packet.srcPort ?? '?'
    } → ${event.packet.dstPort ?? HTTP_PORT})`,
    nodeId: sender.id,
    packet: event.packet,
  });
}

/** The web server answers every request for its root document. */
export function httpOnReceive(
  event: ProtocolEvent,
  holder: NetworkNode,
  nodes: NetworkNode[],
  _edges: NetworkEdge[],
  out: EngineOutcome
): void {
  if (event.type === 'http-response') {
    const peer = deviceWithIp(event.packet.srcIp, nodes);
    out.logs.push({
      text: `[HTTP] ${holder.label} received ${event.packet.payload ?? 'response'} from ${
        peer?.label ?? event.packet.srcIp
      }`,
      nodeId: holder.id,
      packet: event.packet,
    });
    return;
  }

  const requested = path(event);
  const body = requested === '/' || requested === '/index.html' ? '200 OK' : '404 Not Found';

  out.newEvents.push(
    pdu({
      type: 'http-response',
      packet: replyOf(event, holder, {
        type: 'http-response',
        payload: body,
        srcPort: event.packet.dstPort ?? HTTP_PORT,
        dstPort: event.packet.srcPort ?? 1024,
      }),
      holder,
      nodes,
      time: event.time + 1,
    })
  );
}
