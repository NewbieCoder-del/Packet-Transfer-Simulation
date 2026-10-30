import { useRef, useCallback } from 'react';
import type { NetworkNode } from '../../types/network';
import { DEVICE_DEFAULTS } from '../../types/network';
import { useStore } from '../../store';
import { clientToSvg, snap } from '../../utils/geometry';
import { DeviceIconSvg } from '../common/DeviceIcon';

export const NODE_W = 92;
export const NODE_H = 76;
const GRID = 20;

interface Props {
  node: NetworkNode;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export default function DeviceNode({ node, svgRef }: Props) {
  const updateNodePosition = useStore((s) => s.updateNodePosition);
  const selectNode = useStore((s) => s.selectNode);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const canvasTool = useStore((s) => s.canvasTool);
  const connectionSourceId = useStore((s) => s.connectionSourceId);
  const setConnectionSource = useStore((s) => s.setConnectionSource);
  const addEdge = useStore((s) => s.addEdge);
  const snapToGrid = useStore((s) => s.snapToGrid);

  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const meta = DEVICE_DEFAULTS[node.type];
  const isSelected = selectedNodeId === node.id;
  const isSource = connectionSourceId === node.id;
  const isConnectMode = canvasTool === 'connect';

  const linkCount = useStore((s) =>
    s.edges.reduce((n, e) => n + (e.from.nodeId === node.id || e.to.nodeId === node.id ? 1 : 0), 0)
  );
  const activeState = node.tcpState === 'ESTABLISHED';

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isConnectMode) {
        e.stopPropagation();
        if (!connectionSourceId) setConnectionSource(node.id);
        else if (connectionSourceId !== node.id) {
          addEdge(connectionSourceId, node.id);
          setConnectionSource(null);
        }
        return;
      }
      if (canvasTool === 'pan' || e.button === 1) return;

      e.stopPropagation();
      dragging.current = true;
      if (svgRef.current) {
        const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
        offset.current = { x: pt.x - node.x, y: pt.y - node.y };
      }
      (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
      selectNode(node.id);
    },
    [isConnectMode, connectionSourceId, canvasTool, node.id, node.x, node.y, svgRef, selectNode, setConnectionSource, addEdge]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !svgRef.current) return;
      const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
      let nx = pt.x - offset.current.x;
      let ny = pt.y - offset.current.y;
      if (snapToGrid) {
        nx = snap(nx - NODE_W / 2, GRID) + NODE_W / 2;
        ny = snap(ny - NODE_H / 2, GRID) + NODE_H / 2;
      }
      if (Math.abs(nx - node.x) > 0.5 || Math.abs(ny - node.y) > 0.5) {
        updateNodePosition(node.id, nx, ny);
      }
    },
    [node.id, node.x, node.y, svgRef, snapToGrid, updateNodePosition]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const x = node.x - NODE_W / 2;
  const y = node.y - NODE_H / 2;
  const ip = node.interfaces.find((i) => i.ip)?.ip;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ cursor: isConnectMode ? 'crosshair' : canvasTool === 'pan' ? 'grab' : 'move' }}
    >
      {isSelected && (
        <rect
          x={-4}
          y={-4}
          width={NODE_W + 8}
          height={NODE_H + 8}
          rx={14}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}
      {isSource && (
        <rect
          x={-3}
          y={-3}
          width={NODE_W + 6}
          height={NODE_H + 6}
          rx={13}
          fill="none"
          stroke="var(--warn)"
          strokeWidth={2}
        />
      )}

      <rect
        width={NODE_W}
        height={NODE_H}
        rx={10}
        fill="var(--surface-1)"
        stroke={isSelected ? 'var(--accent)' : `${meta.color}66`}
        strokeWidth={isSelected ? 2 : 1.25}
      />
      <rect width={NODE_W} height={26} rx={10} fill={`${meta.color}1f`} />
      <path d={`M0 26 H${NODE_W}`} stroke={`${meta.color}33`} strokeWidth={1} />

      <g style={{ color: meta.color, pointerEvents: 'none' }}>
        <DeviceIconSvg type={node.type} x={7} y={4} size={18} />
      </g>

      <text x={28} y={17} fontSize={9} fontWeight={700} letterSpacing={0.4} fill={meta.color} style={{ pointerEvents: 'none' }}>
        {meta.label.toUpperCase()}
      </text>

      <text
        x={NODE_W / 2}
        y={46}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill="var(--ink-1)"
        style={{ pointerEvents: 'none' }}
      >
        {node.label}
      </text>

      {ip && (
        <text
          x={NODE_W / 2}
          y={60}
          textAnchor="middle"
          fontSize={9.5}
          fontFamily="var(--font-mono)"
          fill="var(--ink-2)"
          style={{ pointerEvents: 'none' }}
        >
          {ip}
        </text>
      )}

      <circle
        cx={NODE_W - 11}
        cy={13}
        r={3.5}
        fill={activeState ? 'var(--ok)' : isSource ? 'var(--warn)' : 'var(--line-2)'}
        stroke="var(--surface-0)"
        strokeWidth={1}
        style={{ pointerEvents: 'none' }}
      />
      <text
        x={NODE_W / 2}
        y={71}
        textAnchor="middle"
        fontSize={8}
        fontFamily="var(--font-mono)"
        fill="var(--ink-3)"
        style={{ pointerEvents: 'none' }}
      >
        {`${linkCount} link${linkCount === 1 ? '' : 's'}${
          Object.keys(node.arpTable).length ? ` · ${Object.keys(node.arpTable).length} ARP` : ''
        }`}
      </text>
    </g>
  );
}
