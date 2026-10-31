import type { NetworkNode, NetworkEdge, ProtocolEvent, ForwardEvent } from '../types/network';
import {
  outcome,
  findDevice,
  isForDevice,
  sendFromOrigin,
  switchForward,
  routerForward,
  arrivalOf,
} from './forwarding';
import type { EngineOutcome } from './forwarding';
import { arpOnSend, arpOnReceive } from './protocols/arp';
import { icmpOnSend, icmpOnReceive } from './protocols/icmp';
import { tcpOnSend, tcpOnReceive } from './protocols/tcp';
import { udpOnSend, udpOnReceive } from './protocols/udp';
import { dnsOnSend, dnsOnReceive } from './protocols/dns';
import { httpOnSend, httpOnReceive } from './protocols/http';

export type { EngineOutcome } from './forwarding';

function onSend(event: ProtocolEvent, holder: NetworkNode, nodes: NetworkNode[], edges: NetworkEdge[], out: EngineOutcome): void {
  switch (event.type) {
    case 'arp-request':
    case 'arp-reply':
      return arpOnSend(event, holder, nodes, edges, out);
    case 'icmp-echo':
    case 'icmp-reply':
      return icmpOnSend(event, holder, nodes, edges, out);
    case 'tcp-syn':
    case 'tcp-syn-ack':
    case 'tcp-ack':
      return tcpOnSend(event, holder, nodes, edges, out);
    case 'udp-datagram':
    case 'udp-reply':
      return udpOnSend(event, holder, nodes, edges, out);
    case 'dns-query':
    case 'dns-response':
      return dnsOnSend(event, holder, nodes, edges, out);
    case 'http-request':
    case 'http-response':
      return httpOnSend(event, holder, nodes, edges, out);
  }
}

function onReceive(
  event: ProtocolEvent,
  holder: NetworkNode,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  out: EngineOutcome
): void {
  switch (event.type) {
    case 'arp-request':
    case 'arp-reply':
      return arpOnReceive(event, holder, nodes, edges, out);
    case 'icmp-echo':
    case 'icmp-reply':
      return icmpOnReceive(event, holder, nodes, edges, out);
    case 'tcp-syn':
    case 'tcp-syn-ack':
    case 'tcp-ack':
      return tcpOnReceive(event, holder, nodes, edges, out);
    case 'udp-datagram':
    case 'udp-reply':
      return udpOnReceive(event, holder, nodes, edges, out);
    case 'dns-query':
    case 'dns-response':
      return dnsOnReceive(event, holder, nodes, edges, out);
    case 'http-request':
    case 'http-response':
      return httpOnReceive(event, holder, nodes, edges, out);
  }
}

/** A relayed frame reaching a device that speaks protocol: rebuild the PDU for its stack. */
function handToStack(event: ForwardEvent, out: EngineOutcome): void {
  out.newEvents.push(arrivalOf(event.resume, event.srcNodeId, event.time + 1));
}

export function processEvent(
  event: ForwardEvent | ProtocolEvent,
  nodes: NetworkNode[],
  edges: NetworkEdge[]
): EngineOutcome {
  const out = outcome();
  const holder = findDevice(event.srcNodeId, nodes);
  if (!holder) return out;

  const packet = event.kind === 'forward' ? event.resume.packet : event.packet;

  if (isForDevice(holder, packet.dstIp)) {
    if (event.kind === 'forward') {
      handToStack(event, out);
      return out;
    }
    onReceive(event, holder, nodes, edges, out);
    return out;
  }

  // Anything this device created itself is transmitted, never relayed on.
  if (event.kind === 'protocol' && event.originNodeId === holder.id) {
    const sent = sendFromOrigin(holder, event, nodes, edges, out);
    if (sent) onSend(sent, holder, nodes, edges, out);
    return out;
  }

  if (holder.type === 'switch') {
    switchForward(holder, asForward(event, holder), nodes, edges, out);
    return out;
  }

  if (holder.type === 'router') {
    routerForward(holder, asForward(event, holder), nodes, edges, out);
    return out;
  }

  out.logs.push({
    text: `[L2] ${holder.label} discards frame for ${packet.dstIp}`,
    nodeId: holder.id,
    packet,
  });
  return out;
}

/** End devices only ever hold protocol events; anything else arriving here is a relay. */
function asForward(event: ProtocolEvent | ForwardEvent, holder: NetworkNode): ForwardEvent {
  if (event.kind === 'forward') return event;
  return {
    kind: 'forward',
    id: event.id,
    time: event.time,
    srcNodeId: holder.id,
    dstNodeId: event.dstNodeId,
    originNodeId: event.originNodeId,
    path: [holder.id],
    resume: event,
    frame: { srcMac: event.packet.srcMac, dstMac: event.packet.dstMac },
  };
}
