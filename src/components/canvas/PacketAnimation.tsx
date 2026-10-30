import type { AnimatedPacket } from '../../types/network';
import { PROTOCOL_COLORS, PROTOCOL_SHORT_LABEL } from '../../types/network';
import { useStore } from '../../store';
import { lerp } from '../../utils/geometry';

interface Props {
  animatedPacket: AnimatedPacket;
}

export default function PacketAnimation({ animatedPacket }: Props) {
  const fromNode = useStore((s) => s.nodes.find((n) => n.id === animatedPacket.fromNodeId));
  const toNode = useStore((s) => s.nodes.find((n) => n.id === animatedPacket.toNodeId));
  if (!fromNode || !toNode) return null;

  const x = lerp(fromNode.x, toNode.x, animatedPacket.progress);
  const y = lerp(fromNode.y, toNode.y, animatedPacket.progress);
  const color = PROTOCOL_COLORS[animatedPacket.packet.protocol];
  const label = PROTOCOL_SHORT_LABEL[animatedPacket.packet.protocol];

  const boxW = Math.max(30, label.length * 6.6 + 10);

  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: 'none' }}>
      <ellipse rx={boxW / 2 + 8} ry={13} fill={color} opacity={0.16} />
      <rect
        x={-boxW / 2}
        y={-9}
        width={boxW}
        height={18}
        rx={5}
        fill={color}
        stroke="var(--surface-0)"
        strokeWidth={1}
      />
      <text
        textAnchor="middle"
        dy={3.5}
        fontSize={9}
        fontWeight={700}
        fontFamily="var(--font-mono)"
        fill="#fff"
      >
        {label}
      </text>
    </g>
  );
}
