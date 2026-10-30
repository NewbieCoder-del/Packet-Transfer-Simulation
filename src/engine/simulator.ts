import type { NetworkNode, NetworkEdge, SimEvent, Packet, TcpState } from '../types/network';
import { findDirectEdge } from './routing';
import { handleArpRequest, handleArpReply } from './protocols/arp';
import { handleIcmpEcho, handleIcmpReply } from './protocols/icmp';
import { handleTcpSyn, handleTcpSynAck, handleTcpAck } from './protocols/tcp';
import { handleDnsQuery, handleDnsResponse } from './protocols/dns';
import { handleHttpRequest, handleHttpResponse } from './protocols/http';

export interface SimulationResult {
  arpMutations: Array<{ nodeId: string; arpEntry: { ip: string; mac: string } }>;
  tcpMutations: Array<{ nodeId: string; tcpState: TcpState }>;
  newEvents: SimEvent[];
  animations: Array<{ fromNodeId: string; toNodeId: string; packet: Packet }>;
  logs: string[];
}

export function processEvent(
  event: SimEvent,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
): SimulationResult {
  const result: SimulationResult = {
    arpMutations: [],
    tcpMutations: [],
    newEvents: [],
    animations: [],
    logs: [],
  };

  const findEdge = (from: string, to: string) => findDirectEdge(from, to, edges);

  switch (event.type) {
    case 'arp-request': {
      const arpResult = handleArpRequest(event, nodes, findEdge, event.time);
      result.arpMutations.push(...arpResult.stateMutations);
      result.newEvents.push(...arpResult.newEvents);
      result.animations.push(...arpResult.animations);
      result.logs.push(...arpResult.logs);
      break;
    }
    case 'arp-reply': {
      const arpResult = handleArpReply(event, nodes);
      result.arpMutations.push(...arpResult.stateMutations);
      result.newEvents.push(...arpResult.newEvents);
      result.animations.push(...arpResult.animations);
      result.logs.push(...arpResult.logs);
      break;
    }
    case 'icmp-echo': {
      const icmpResult = handleIcmpEcho(event, nodes, event.time);
      result.newEvents.push(...icmpResult.newEvents);
      result.animations.push(...icmpResult.animations);
      result.logs.push(...icmpResult.logs);
      break;
    }
    case 'icmp-reply': {
      const icmpResult = handleIcmpReply(event, nodes);
      result.newEvents.push(...icmpResult.newEvents);
      result.animations.push(...icmpResult.animations);
      result.logs.push(...icmpResult.logs);
      break;
    }
    case 'tcp-syn': {
      const tcpResult = handleTcpSyn(event, nodes, event.time);
      result.tcpMutations.push(...tcpResult.stateMutations);
      result.newEvents.push(...tcpResult.newEvents);
      result.animations.push(...tcpResult.animations);
      result.logs.push(...tcpResult.logs);
      break;
    }
    case 'tcp-syn-ack': {
      const tcpResult = handleTcpSynAck(event, nodes, event.time);
      result.tcpMutations.push(...tcpResult.stateMutations);
      result.newEvents.push(...tcpResult.newEvents);
      result.animations.push(...tcpResult.animations);
      result.logs.push(...tcpResult.logs);
      break;
    }
    case 'tcp-ack': {
      const tcpResult = handleTcpAck(event, nodes);
      result.tcpMutations.push(...tcpResult.stateMutations);
      result.newEvents.push(...tcpResult.newEvents);
      result.animations.push(...tcpResult.animations);
      result.logs.push(...tcpResult.logs);
      break;
    }
    case 'dns-query': {
      const dnsResult = handleDnsQuery(event, nodes, event.time);
      result.newEvents.push(...dnsResult.newEvents);
      result.animations.push(...dnsResult.animations);
      result.logs.push(...dnsResult.logs);
      break;
    }
    case 'dns-response': {
      const dnsResult = handleDnsResponse(event, nodes);
      result.newEvents.push(...dnsResult.newEvents);
      result.animations.push(...dnsResult.animations);
      result.logs.push(...dnsResult.logs);
      break;
    }
    case 'http-request': {
      const httpResult = handleHttpRequest(event, nodes, event.time);
      result.newEvents.push(...httpResult.newEvents);
      result.animations.push(...httpResult.animations);
      result.logs.push(...httpResult.logs);
      break;
    }
    case 'http-response': {
      const httpResult = handleHttpResponse(event, nodes);
      result.newEvents.push(...httpResult.newEvents);
      result.animations.push(...httpResult.animations);
      result.logs.push(...httpResult.logs);
      break;
    }
    default: {
      result.logs.push(`[SIM] Unknown event type: ${event.type}`);
    }
  }

  return result;
}
