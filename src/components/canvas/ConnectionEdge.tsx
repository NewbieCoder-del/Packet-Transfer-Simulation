import type { NetworkEdge } from '../../types/network';
import { useStore } from '../../store';

interface Props {
  edge: NetworkEdge;
}

export default function ConnectionEdge({ edge }: Props) {
  const nodes = useStore((s) => s.nodes);
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);
  const selectEdge = useStore((s) => s.selectEdge);

  const fromNode = nodes.find((n) => n.id === edge.from.nodeId);
  const toNode = nodes.find((n) => n.id === edge.to.nodeId);
  if (!fromNode || !toNode) return null;

  const isSelected = selectedEdgeId === edge.id;
  const isDown = edge.status === 'down';

  return (
    <line
      x1={fromNode.x}
      y1={fromNode.y}
      x2={toNode.x}
      y2={toNode.y}
      stroke={isDown ? '#EF4444' : isSelected ? '#3B82F6' : '#6B7280'}
      strokeWidth={isSelected ? 3 : 2}
      strokeDasharray={isDown ? '6 4' : undefined}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        selectEdge(edge.id);
      }}
    />
  );
}
