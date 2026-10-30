import type { NetworkEdge } from '../../types/network';
import { useStore } from '../../store';

interface Props {
  edge: NetworkEdge;
}

export default function ConnectionEdge({ edge }: Props) {
  const nodes = useStore((s) => s.nodes);
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);
  const selectEdge = useStore((s) => s.selectEdge);
  const busy = useStore((s) => s.activePackets.some((p) => p.edgeId === edge.id));

  const fromNode = nodes.find((n) => n.id === edge.from.nodeId);
  const toNode = nodes.find((n) => n.id === edge.to.nodeId);
  if (!fromNode || !toNode) return null;

  const isSelected = selectedEdgeId === edge.id;
  const isDown = edge.status === 'down';

  const stroke = isDown ? 'var(--bad)' : isSelected ? 'var(--accent)' : 'var(--line-2)';

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        selectEdge(edge.id);
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Wide transparent hit target so thin links stay clickable at any zoom. */}
      <line x1={fromNode.x} y1={fromNode.y} x2={toNode.x} y2={toNode.y} stroke="transparent" strokeWidth={16} />
      <line
        x1={fromNode.x}
        y1={fromNode.y}
        x2={toNode.x}
        y2={toNode.y}
        stroke={stroke}
        strokeWidth={isSelected ? 3 : 2}
        strokeDasharray={isDown ? '7 5' : busy ? '10 6' : undefined}
        className={busy ? 'nlab-live' : undefined}
      />
      {(isSelected || isDown) && (
        <g transform={`translate(${(fromNode.x + toNode.x) / 2}, ${(fromNode.y + toNode.y) / 2})`}>
          <rect x={-16} y={-8} width={32} height={16} rx={4} fill="var(--surface-1)" stroke={stroke} strokeWidth={1} />
          <text textAnchor="middle" dy={3.5} fontSize={8.5} fontFamily="var(--font-mono)" fontWeight={700} fill={stroke}>
            {isDown ? 'DOWN' : 'UP'}
          </text>
        </g>
      )}
    </g>
  );
}
