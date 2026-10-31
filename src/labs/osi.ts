import type { LabStep } from './types';
import { crc32Hex } from './crc';

export interface OsiConfig {
  message: string;
  srcIp: string;
  dstIp: string;
  transport: 'tcp' | 'udp';
  srcPort: number;
  dstPort: number;
}

const TCP_HEADER = 20;
const UDP_HEADER = 8;
const IP_HEADER = 20;
const ETHERNET_HEADER = 14;
const ETHERNET_FCS = 4;

const SRC_MAC = 'AA:BB:CC:00:00:01';
const DST_MAC = 'AA:BB:CC:00:00:0C';

export function buildOsiSteps(cfg: OsiConfig): LabStep[] {
  const message = cfg.message.length > 0 ? cfg.message : 'Hello, network!';
  const bytes = new TextEncoder().encode(message);
  const tcp = cfg.transport === 'tcp';
  const transportName = tcp ? 'TCP' : 'UDP';
  const transportHeader = tcp ? TCP_HEADER : UDP_HEADER;
  const protocolNumber = tcp ? 6 : 17;
  const transportPdu = tcp ? 'Segment' : 'Datagram';
  const segmentSize = bytes.length + transportHeader;
  const packetSize = segmentSize + IP_HEADER;
  const frameSize = packetSize + ETHERNET_HEADER + ETHERNET_FCS;
  const fcs = crc32Hex(bytes);
  const hexPreview = Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');

  const steps: LabStep[] = [];
  const push = (step: LabStep) => steps.push(step);

  push({
    title: 'Layer 7 - Application: the message',
    badge: 'Step 1 of 14',
    detail: [
      `The user data is "${message}" - ${bytes.length} byte${bytes.length === 1 ? '' : 's'} of text.`,
      'At the application layer this payload has no network header yet; the PDU is simply called data.',
    ],
  });

  push({
    title: 'Layer 6 - Presentation: serialise',
    badge: 'Step 2 of 14',
    detail: [
      `The text is encoded as UTF-8: ${hexPreview}${bytes.length > 8 ? ' …' : ''} (${bytes.length} bytes).`,
      'Presentation decides representation (character set, compression, encryption); it adds no header of its own.',
    ],
  });

  push({
    title: 'Layer 5 - Session: keep the conversation together',
    badge: 'Step 3 of 14',
    detail: [
      'A session handle is attached so the receiver can match this message to an ongoing conversation.',
      'Like layer 6 this is bookkeeping rather than a wire header - the payload size is still ' + bytes.length + ' bytes.',
    ],
  });

  push({
    title: `Layer 4 - Transport: add the ${transportName} header`,
    badge: transportPdu,
    detail: [
      `${transportName} header: source port ${cfg.srcPort}, destination port ${cfg.dstPort}${tcp ? ', plus sequence and Acknowledgment numbers and flags' : ', plus length and checksum'}.`,
      `The ${transportPdu.toLowerCase()} is ${segmentSize} bytes (${bytes.length} payload + ${transportHeader} header).`,
      tcp
        ? 'TCP will hand this segment to the network layer only after the three-way handshake established a connection.'
        : 'UDP hands the datagram to the network layer immediately - no connection, no state.',
    ],
  });

  push({
    title: 'Layer 3 - Network: add the IPv4 header',
    badge: 'Packet',
    detail: [
      `IPv4 header: version 4, source ${cfg.srcIp}, destination ${cfg.dstIp}, protocol ${protocolNumber} (${transportName}), TTL 64.`,
      `The packet is ${packetSize} bytes and now survives several routers; each router decrements TTL by one.`,
    ],
  });

  push({
    title: 'Layer 2 - Data Link: add the Ethernet II header and FCS',
    badge: 'Frame',
    detail: [
      `Ethernet header: destination ${DST_MAC}, source ${SRC_MAC} (resolved by ARP), EtherType 0x0800 (IPv4).`,
      `Trailer: 32-bit frame check sequence 0x${fcs} computed with CRC-32 over the payload.`,
      `The frame is ${frameSize} bytes (${packetSize} packet + ${ETHERNET_HEADER + ETHERNET_FCS} frame overhead).`,
    ],
  });

  push({
    title: 'Layer 1 - Physical: serialise the frame into bits',
    badge: `${frameSize * 8} bits`,
    detail: [
      `The frame becomes ${frameSize * 8} bits on the medium (${frameSize} bytes x 8).`,
      `At 1 Gbit/s that takes ${((frameSize * 8) / 1e9 * 1e6).toFixed(1)} microseconds.`,
      'The physical layer adds framing symbols and signalling; the payload of the layers above is untouched.',
    ],
  });

  push({
    title: 'Layer 1 (receive) - recover the bit stream',
    badge: 'Step 8 of 14',
    detail: [
      'The receiver derives the clock from the incoming signal and groups the bits back into octets.',
      'The recovered frame is complete (the receiver can tell where it ends from the framing).',
    ],
  });

  push({
    title: 'Layer 2 (receive) - verify and strip Ethernet',
    badge: 'Step 9 of 14',
    detail: [
      `Recomputing CRC-32 over the payload yields 0x${fcs}, the same value that is in the trailer, so the frame is intact.`,
      `The destination ${DST_MAC} matches this host, so the 18-byte frame overhead is stripped and the ${packetSize}-byte packet goes up to the network layer.`,
    ],
  });

  push({
    title: 'Layer 3 (receive) - verify and strip IPv4',
    badge: 'Step 10 of 14',
    detail: [
      `Destination ${cfg.dstIp} matches this host; protocol ${protocolNumber} says the payload is ${transportName}.`,
      `TTL is read (the packet arrived with TTL 64 on this direct path), then the ${IP_HEADER}-byte header is stripped and the ${segmentSize}-byte ${transportPdu.toLowerCase()} goes up.`,
    ],
  });

  push({
    title: `Layer 4 (receive) - strip ${transportName}`,
    badge: 'Step 11 of 14',
    detail: [
      `Destination port ${cfg.dstPort} identifies the receiving application.`,
      tcp
        ? 'TCP reorders segments by sequence number, acknowledges this one and removes the 20-byte header.'
        : 'UDP checks the length and checksum, then removes the 8-byte header - no acknowledgment is sent.',
    ],
  });

  push({
    title: 'Layer 5 (receive) - restore the session',
    badge: 'Step 12 of 14',
    detail: [
      'The session handle routes the payload back into the conversation it belongs to.',
      `The delivered payload is still the original ${bytes.length} bytes.`,
    ],
  });

  push({
    title: 'Layer 6 (receive) - decode',
    badge: 'Step 13 of 14',
    detail: [
      'The octets are decoded from UTF-8 back into characters (and decrypted or decompressed if those were applied).',
      `Result: "${message}".`,
    ],
  });

  push({
    title: 'Layer 7 (receive) - deliver to the application',
    badge: 'Step 14 of 14',
    detail: [
      `The application on ${cfg.dstIp} receives the message from ${cfg.srcIp}:${cfg.srcPort}.`,
      `Encapsulation added ${frameSize - bytes.length} bytes of headers and trailer around ${bytes.length} bytes of data; decapsulation removed them again.`,
    ],
  });

  return steps;
}
