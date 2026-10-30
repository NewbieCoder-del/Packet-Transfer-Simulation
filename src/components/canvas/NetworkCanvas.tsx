import { useRef, useCallback, useState, useEffect } from 'react';
import { useStore } from '../../store';
import type { DeviceType } from '../../types/network';
import DeviceNode from './DeviceNode';
import ConnectionEdge from './ConnectionEdge';
import PacketAnimation from './PacketAnimation';
import CanvasToolbar from './CanvasToolbar';

export default function NetworkCanvas() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const activePackets = useStore((s) => s.activePackets);
  const addNode = useStore((s) => s.addNode);
  const selectNode = useStore((s) => s.selectNode);
  const selectEdge = useStore((s) => s.selectEdge);
  const connectionMode = useStore((s) => s.connectionMode);
  const setConnectionSource = useStore((s) => s.setConnectionSource);
  const canvasTool = useStore((s) => s.canvasTool);
  const setCanvasTool = useStore((s) => s.setCanvasTool);

  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 2000, h: 1500 });
  const panning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  const zoom = useCallback((factor: number) => {
    setViewBox((vb) => {
      const cx = vb.x + vb.w / 2;
      const cy = vb.y + vb.h / 2;
      const nw = vb.w * factor;
      const nh = vb.h * factor;
      return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    });
  }, []);

  // Keyboard shortcuts — use e.code for IME-safe physical key detection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'KeyV') setCanvasTool('select');
      else if (e.code === 'KeyG') setCanvasTool('pan');
      else if (e.code === 'BracketLeft') zoom(0.8);
      else if (e.code === 'BracketRight') zoom(1.25);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCanvasTool, zoom]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('deviceType') as DeviceType;
      if (!type || !svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;
      const x = viewBox.x + (e.clientX - rect.left) * scaleX;
      const y = viewBox.y + (e.clientY - rect.top) * scaleY;

      addNode(type, x, y);
    },
    [addNode, viewBox]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    zoom(e.deltaY > 0 ? 1.1 : 0.9);
  }, [zoom]);

  const startPan = useCallback(
    (e: React.PointerEvent) => {
      panning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
      (e.target as SVGElement).setPointerCapture(e.pointerId);
    },
    [viewBox.x, viewBox.y]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (connectionMode) {
        setConnectionSource(null);
        return;
      }

      // Pan mode: always pan regardless of target
      if (canvasTool === 'pan') {
        startPan(e);
        return;
      }

      // Select mode: only pan when clicking background
      if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'rect' && (e.target as SVGElement).dataset.bg) {
        selectNode(null);
        selectEdge(null);
        startPan(e);
      }
    },
    [connectionMode, canvasTool, startPan, selectNode, selectEdge, setConnectionSource]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!panning.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;
      setViewBox((vb) => ({
        ...vb,
        x: panStart.current.vx - dx * scaleX,
        y: panStart.current.vy - dy * scaleY,
      }));
    },
    [viewBox.w, viewBox.h]
  );

  const handlePointerUp = useCallback(() => {
    panning.current = false;
  }, []);

  const svgCursor =
    connectionMode ? 'crosshair' :
    canvasTool === 'pan' ? 'grab' :
    'default';

  return (
    <div className="relative flex-1 bg-gray-950 overflow-hidden" onDragOver={handleDragOver} onDrop={handleDrop}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        style={{ cursor: svgCursor }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1F2937" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect
          data-bg="true"
          x={viewBox.x - 5000}
          y={viewBox.y - 5000}
          width={viewBox.w + 10000}
          height={viewBox.h + 10000}
          fill="url(#grid)"
        />

        {/* Edges */}
        {edges.map((edge) => (
          <ConnectionEdge key={edge.id} edge={edge} />
        ))}

        {/* Nodes */}
        {nodes.map((node) => (
          <DeviceNode key={node.id} node={node} svgRef={svgRef} />
        ))}

        {/* Packet animations */}
        {activePackets.map((pkt) => (
          <PacketAnimation key={pkt.id} animatedPacket={pkt} />
        ))}
      </svg>

      <CanvasToolbar onZoomIn={() => zoom(0.8)} onZoomOut={() => zoom(1.25)} />
    </div>
  );
}
