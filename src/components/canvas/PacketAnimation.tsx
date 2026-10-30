import type { AnimatedPacket } from '../../types/network';
import { useStore } from '../../store';
import { lerp } from '../../utils/geometry';

const PROTOCOL_COLORS: Record<string, string> = {
  'arp-request': '#F97316',
  'arp-reply': '#FB923C',
  'icmp-echo': '#22D3EE',
  'icmp-reply': '#67E8F9',
  'tcp-syn': '#3B82F6',
  'tcp-syn-ack': '#60A5FA',
  'tcp-ack': '#93C5FD',
  'tcp-fin': '#1D4ED8',
  'dns-query': '#A855F7',
  'dns-response': '#C084FC',
  'http-request': '#22C55E',
  'http-response': '#4ADE80',
};

const PROTOCOL_LABELS: Record<string, string> = {
  'arp-request': 'ARP',
  'arp-reply': 'ARP',
  'icmp-echo': 'PING',
  'icmp-reply': 'PONG',
  'tcp-syn': 'SYN',
  'tcp-syn-ack': 'SYN-ACK',
  'tcp-ack': 'ACK',
  'tcp-fin': 'FIN',
  'dns-query': 'DNS',
  'dns-response': 'DNS',
  'http-request': 'HTTP',
  'http-response': 'HTTP',
};

interface Props {
  animatedPacket: AnimatedPacket;
}

export default function PacketAnimation({ animatedPacket }: Props) {
  const nodes = useStore((s) => s.nodes);
  const fromNode = nodes.find((n) => n.id === animatedPacket.fromNodeId);
  const toNode = nodes.find((n) => n.id === animatedPacket.toNodeId);
  if (!fromNode || !toNode) return null;

  const x = lerp(fromNode.x, toNode.x, animatedPacket.progress);
  const y = lerp(fromNode.y, toNode.y, animatedPacket.progress);
  const color = PROTOCOL_COLORS[animatedPacket.packet.protocol] ?? '#9CA3AF';
  const label = PROTOCOL_LABELS[animatedPacket.packet.protocol] ?? '?';

  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: 'none' }}>
      {/* Glow effect */}
      <circle r={14} fill={color} opacity={0.15} />
      {/* Packet circle */}
      <circle r={10} fill={color} opacity={0.9} />
      {/* Label */}
      <text
        textAnchor="middle"
        dy={0.35}
        fontSize={6}
        fontWeight={700}
        fill="#fff"
      >
        {label}
      </text>
    </g>
  );
}
