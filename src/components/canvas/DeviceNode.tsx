import { useRef, useCallback } from 'react';
import type { NetworkNode } from '../../types/network';
import { DEVICE_DEFAULTS } from '../../types/network';
import { useStore } from '../../store';

const NODE_WIDTH = 80;
const NODE_HEIGHT = 80;

interface Props {
  node: NetworkNode;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

export default function DeviceNode({ node, svgRef }: Props) {
  const updateNodePosition = useStore((s) => s.updateNodePosition);
  const selectNode = useStore((s) => s.selectNode);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const connectionMode = useStore((s) => s.connectionMode);
  const connectionSourceId = useStore((s) => s.connectionSourceId);
  const setConnectionSource = useStore((s) => s.setConnectionSource);
  const addEdge = useStore((s) => s.addEdge);
  const canvasTool = useStore((s) => s.canvasTool);

  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const defaults = DEVICE_DEFAULTS[node.type];
  const isSelected = selectedNodeId === node.id;
  const isConnectionSource = connectionSourceId === node.id;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (connectionMode) {
        e.stopPropagation();
        if (!connectionSourceId) {
          setConnectionSource(node.id);
        } else if (connectionSourceId !== node.id) {
          addEdge(connectionSourceId, node.id);
          setConnectionSource(null);
        }
        return;
      }

      // In pan mode, let the event bubble up to the canvas for panning
      if (canvasTool === 'pan') return;

      e.stopPropagation();
      dragging.current = true;
      if (svgRef.current) {
        const svgPt = clientToSvg(svgRef.current, e.clientX, e.clientY);
        offset.current = { x: svgPt.x - node.x, y: svgPt.y - node.y };
      }
      (e.target as SVGElement).setPointerCapture(e.pointerId);
      selectNode(node.id);
    },
    [connectionMode, connectionSourceId, canvasTool, node.id, node.x, node.y, svgRef, selectNode, setConnectionSource, addEdge]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !svgRef.current) return;
      const svgPt = clientToSvg(svgRef.current, e.clientX, e.clientY);
      updateNodePosition(node.id, svgPt.x - offset.current.x, svgPt.y - offset.current.y);
    },
    [node.id, svgRef, updateNodePosition]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <g
      transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ cursor: connectionMode ? 'crosshair' : canvasTool === 'pan' ? 'grab' : 'pointer' }}
    >
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={12}
        fill={defaults.color + '18'}
        stroke={isSelected ? '#3B82F6' : isConnectionSource ? '#F59E0B' : defaults.color + '66'}
        strokeWidth={isSelected || isConnectionSource ? 2.5 : 1.5}
      />
      <text
        x={NODE_WIDTH / 2}
        y={32}
        textAnchor="middle"
        fontSize={22}
        style={{ pointerEvents: 'none' }}
      >
        {defaults.icon}
      </text>
      <text
        x={NODE_WIDTH / 2}
        y={56}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill="#E5E7EB"
        style={{ pointerEvents: 'none' }}
      >
        {node.label}
      </text>
      {node.interfaces[0]?.ip && (
        <text
          x={NODE_WIDTH / 2}
          y={70}
          textAnchor="middle"
          fontSize={8}
          fill="#9CA3AF"
          style={{ pointerEvents: 'none' }}
        >
          {node.interfaces[0].ip}
        </text>
      )}
    </g>
  );
}
