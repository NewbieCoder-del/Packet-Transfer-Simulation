import type { Packet, ProtocolType } from '../../types/network';
import { PROTOCOL_COLORS, PROTOCOL_SHORT_LABEL } from '../../types/network';

type Row = [string, string];
interface Section {
  title: string;
  rows: Row[];
}

const IP_PROTOCOL: Record<ProtocolType, string> = {
  'arp-request': '— (EtherType 0x0806)',
  'arp-reply': '— (EtherType 0x0806)',
  'icmp-echo': '1 (ICMP)',
  'icmp-reply': '1 (ICMP)',
  'tcp-syn': '6 (TCP)',
  'tcp-syn-ack': '6 (TCP)',
  'tcp-ack': '6 (TCP)',
  'udp-datagram': '17 (UDP)',
  'udp-reply': '17 (UDP)',
  'dns-query': '17 (UDP)',
  'dns-response': '17 (UDP)',
  'http-request': '6 (TCP)',
  'http-response': '6 (TCP)',
};

const TCP_FLAGS: Partial<Record<ProtocolType, string>> = {
  'tcp-syn': 'SYN',
  'tcp-syn-ack': 'SYN, ACK',
  'tcp-ack': 'ACK',
};

const ICMP_TYPE: Partial<Record<ProtocolType, string>> = {
  'icmp-echo': '8 (Echo Request) code 0',
  'icmp-reply': '0 (Echo Reply) code 0',
};

function isTcp(type: ProtocolType): boolean {
  return type.startsWith('tcp-') || type.startsWith('http-');
}

function isUdp(type: ProtocolType): boolean {
  return type.startsWith('udp-') || type.startsWith('dns-');
}

function sections(packet: Packet): Section[] {
  const list: Section[] = [
    {
      title: 'Ethernet II',
      rows: [
        ['Destination', packet.dstMac],
        ['Source', packet.srcMac],
        ['Type', packet.protocol.startsWith('arp-') ? '0x0806 (ARP)' : '0x0800 (IPv4)'],
      ],
    },
  ];

  if (packet.protocol.startsWith('arp-')) {
    const request = packet.protocol === 'arp-request';
    list.push({
      title: 'ARP',
      rows: [
        ['Operation', request ? '1 (request)' : '2 (reply)'],
        ['Sender IP', packet.srcIp],
        ['Sender MAC', packet.srcMac],
        ['Target IP', packet.dstIp],
        ['Target MAC', request ? 'unresolved (broadcast)' : packet.dstMac],
      ],
    });
    return list;
  }

  list.push({
    title: 'IPv4',
    rows: [
      ['Source', packet.srcIp],
      ['Destination', packet.dstIp],
      ['Protocol', IP_PROTOCOL[packet.protocol]],
      ['Time to live', String(packet.ttl)],
    ],
  });

  if (isTcp(packet.protocol)) {
    const flags = packet.protocol.startsWith('tcp-')
      ? (TCP_FLAGS[packet.protocol as 'tcp-syn' | 'tcp-syn-ack' | 'tcp-ack'] ?? 'ACK')
      : 'PSH, ACK';
    list.push({
      title: 'TCP',
      rows: [
        ['Source port', String(packet.srcPort ?? '—')],
        ['Destination port', String(packet.dstPort ?? '—')],
        ['Flags', flags],
      ],
    });
  } else if (isUdp(packet.protocol)) {
    list.push({
      title: 'UDP',
      rows: [
        ['Source port', String(packet.srcPort ?? '—')],
        ['Destination port', String(packet.dstPort ?? '—')],
      ],
    });
  } else if (packet.protocol.startsWith('icmp-')) {
    list.push({
      title: 'ICMP',
      rows: [
        ['Type / code', ICMP_TYPE[packet.protocol] ?? '—'],
        ['Data size', packet.payload ? `${packet.payload.length} bytes` : '0 bytes'],
      ],
    });
  }

  const application =
    packet.protocol.startsWith('dns-')
      ? 'DNS'
      : packet.protocol.startsWith('http-')
        ? 'HTTP'
        : null;

  if (application || packet.payload) {
    const rows: Row[] = [];
    if (application) rows.push(['Service', application]);
    if (packet.payload) rows.push(['Data', packet.payload]);
    list.push({ title: application ? `${application} payload` : 'Payload', rows });
  }

  return list;
}

export default function PacketInspector({
  packet,
  deviceLabel,
  onClose,
}: {
  packet: Packet;
  deviceLabel?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 w-[300px] shrink-0 flex-col border-l border-line-1 bg-surface-2">
      <header className="flex h-8 shrink-0 items-center gap-2 px-3">
        <span
          className="rounded-xs px-1.5 py-0.5 font-mono text-[10px] font-bold"
          style={{ backgroundColor: `${PROTOCOL_COLORS[packet.protocol]}22`, color: PROTOCOL_COLORS[packet.protocol] }}
        >
          {PROTOCOL_SHORT_LABEL[packet.protocol]}
        </span>
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-3">PDU Details</h3>
        <button
          onClick={onClose}
          aria-label="Close packet details"
          className="ml-auto rounded-xs px-1 text-[13px] leading-none text-ink-3 hover:text-ink-1"
        >
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <p className="pb-2 font-mono text-[10px] text-ink-3">
          {`${packet.srcIp} → ${packet.dstIp}${deviceLabel ? ` · seen by ${deviceLabel}` : ''}`}
        </p>
        {sections(packet).map((section) => (
          <div key={section.title} className="mb-2 rounded-md border border-line-1 bg-surface-1">
            <h4 className="border-b border-line-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {section.title}
            </h4>
            <div className="divide-y divide-line-1">
              {section.rows.map(([k, v], i) => (
                <div key={`${k}-${i}`} className="flex items-baseline justify-between gap-3 px-2.5 py-1">
                  <span className="shrink-0 text-[10px] text-ink-3">{k}</span>
                  <span className="truncate font-mono text-[10px] text-ink-1">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
