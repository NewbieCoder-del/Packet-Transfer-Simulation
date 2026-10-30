import { useRef, useCallback, useState, useEffect } from 'react';
import { useStore } from '../../store';
import type { DeviceType } from '../../types/network';
import DeviceNode, { NODE_W, NODE_H } from './DeviceNode';
import ConnectionEdge from './ConnectionEdge';
import PacketAnimation from './PacketAnimation';
import CanvasToolbar from './CanvasToolbar';
import { clientToSvg, snap } from '../../utils/geometry';

const BASE_W = 2000;
const BASE_H = 1500;
const GRID = 20;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function NetworkCanvas() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const activePackets = useStore((s) => s.activePackets);
  const addNode = useStore((s) => s.addNode);
  const removeNode = useStore((s) => s.removeNode);
  const removeEdge = useStore((s) => s.removeEdge);
  const selectNode = useStore((s) => s.selectNode);
  const selectEdge = useStore((s) => s.selectEdge);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);
  const canvasTool = useStore((s) => s.canvasTool);
  const setCanvasTool = useStore((s) => s.setCanvasTool);
  const pendingDeviceType = useStore((s) => s.pendingDeviceType);
  const setPendingDeviceType = useStore((s) => s.setPendingDeviceType);
  const connectionSourceId = useStore((s) => s.connectionSourceId);
  const setConnectionSource = useStore((s) => s.setConnectionSource);
  const snapToGrid = useStore((s) => s.snapToGrid);
  const setCanvasZoom = useStore((s) => s.setCanvasZoom);
  const t = useStore((s) => s.t);

  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, w: BASE_W, h: BASE_H });
  const [spacePan, setSpacePan] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const pan = useRef<{ startX: number; startY: number; vx: number; vy: number; moved: boolean } | null>(null);

  const isConnectMode = canvasTool === 'connect';
  const isPanMode = canvasTool === 'pan' || spacePan;

  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    setViewBox((vb) => {
      const nextW = Math.min(BASE_W / MIN_ZOOM, Math.max(BASE_W / MAX_ZOOM, vb.w * factor));
      const applied = nextW / vb.w;
      if (applied === 1) return vb;

      const svg = svgRef.current;
      if (clientX === undefined || clientY === undefined || !svg) {
        const cx = vb.x + vb.w / 2;
        const cy = vb.y + vb.h / 2;
        return { x: cx - nextW / 2, y: cy - (vb.h * applied) / 2, w: nextW, h: vb.h * applied };
      }

      const anchor = clientToSvg(svg, clientX, clientY);
      return {
        x: anchor.x - (anchor.x - vb.x) * applied,
        y: anchor.y - (anchor.y - vb.y) * applied,
        w: nextW,
        h: vb.h * applied,
      };
    });
  }, []);

  useEffect(() => {
    setCanvasZoom(BASE_W / viewBox.w);
  }, [viewBox.w, setCanvasZoom]);

  const fitView = useCallback(() => {
    if (nodes.length === 0) {
      setViewBox({ x: 0, y: 0, w: BASE_W, h: BASE_H });
      return;
    }
    const pad = 120;
    const minX = Math.min(...nodes.map((n) => n.x - NODE_W / 2)) - pad;
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_W / 2)) + pad;
    const minY = Math.min(...nodes.map((n) => n.y - NODE_H / 2)) - pad;
    const maxY = Math.max(...nodes.map((n) => n.y + NODE_H / 2)) + pad;

    const svg = svgRef.current;
    const aspect = svg ? svg.clientWidth / svg.clientHeight : 4 / 3;
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const w = Math.max(contentW, contentH * aspect);
    const h = w / aspect;
    setViewBox({
      x: (minX + maxX) / 2 - w / 2,
      y: (minY + maxY) / 2 - h / 2,
      w,
      h,
    });
  }, [nodes]);

  /* Wheel needs a non-passive native listener to keep preventDefault working. */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.deltaY > 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  /* Keyboard: tool switching, zoom, fit, delete, escape. Ignores form fields and chords. */
  useEffect(() => {
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.code === 'Space') {
        setSpacePan(true);
        e.preventDefault();
        return;
      }
      switch (e.code) {
        case 'KeyV':
          setCanvasTool('select');
          setPendingDeviceType(null);
          break;
        case 'KeyH':
          setCanvasTool('pan');
          break;
        case 'KeyC':
          setCanvasTool('connect');
          break;
        case 'KeyF':
          fitView();
          break;
        case 'BracketLeft':
          zoomAt(1 / 1.2);
          break;
        case 'BracketRight':
          zoomAt(1.2);
          break;
        case 'Equal':
        case 'NumpadAdd':
          zoomAt(1.2);
          break;
        case 'Minus':
        case 'NumpadSubtract':
          zoomAt(1 / 1.2);
          break;
        case 'Escape':
          setConnectionSource(null);
          setPendingDeviceType(null);
          selectNode(null);
          selectEdge(null);
          break;
        case 'Delete':
        case 'Backspace': {
          const state = useStore.getState();
          if (state.selectedNodeId) removeNode(state.selectedNodeId);
          else if (state.selectedEdgeId) removeEdge(state.selectedEdgeId);
          break;
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePan(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [setCanvasTool, setPendingDeviceType, setConnectionSource, selectNode, selectEdge, fitView, zoomAt, removeNode, removeEdge]);

  const placeDevice = useCallback(
    (type: DeviceType, x: number, y: number) => {
      addNode(type, snapToGrid ? snap(x, GRID) : x, snapToGrid ? snap(y, GRID) : y);
    },
    [addNode, snapToGrid]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('deviceType') as DeviceType;
      if (!type || !svgRef.current) return;
      const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
      placeDevice(type, pt.x, pt.y);
      setPendingDeviceType(null);
    },
    [placeDevice, setPendingDeviceType]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      const onBackground = e.target === svgRef.current || (e.target as SVGElement).dataset?.bg === 'true';

      if (e.button === 1 || isPanMode) {
        pan.current = { startX: e.clientX, startY: e.clientY, vx: viewBox.x, vy: viewBox.y, moved: false };
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        return;
      }

      if (!onBackground) return;
      pan.current = { startX: e.clientX, startY: e.clientY, vx: viewBox.x, vy: viewBox.y, moved: false };
      (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    },
    [isPanMode, viewBox.x, viewBox.y]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!svgRef.current) return;

      if (isConnectMode && connectionSourceId) {
        setCursor(clientToSvg(svgRef.current, e.clientX, e.clientY));
      }

      if (!pan.current) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = e.clientX - pan.current.startX;
      const dy = e.clientY - pan.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) pan.current.moved = true;
      if (!pan.current.moved) return;
      setViewBox((vb) => ({
        ...vb,
        x: pan.current!.vx - dx * (vb.w / rect.width),
        y: pan.current!.vy - dy * (vb.h / rect.height),
      }));
    },
    [isConnectMode, connectionSourceId]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const wasDrag = pan.current?.moved;
      pan.current = null;
      if (e.button !== 0 || wasDrag || !svgRef.current) return;

      const onBackground = e.target === svgRef.current || (e.target as SVGElement).dataset?.bg === 'true';
      if (!onBackground) return;

      if (pendingDeviceType) {
        const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
        placeDevice(pendingDeviceType, pt.x, pt.y);
        setPendingDeviceType(null);
        return;
      }
      if (!isConnectMode) {
        setConnectionSource(null);
        selectNode(null);
        selectEdge(null);
      }
    },
    [pendingDeviceType, isConnectMode, placeDevice, setPendingDeviceType, setConnectionSource, selectNode, selectEdge]
  );

  const sourceNode = nodes.find((n) => n.id === connectionSourceId);
  const cursorStyle = pendingDeviceType
    ? 'copy'
    : isConnectMode
      ? 'crosshair'
      : isPanMode
        ? 'grab'
        : 'default';

  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden bg-surface-0"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        style={{ cursor: cursorStyle, backgroundColor: 'var(--canvas-bg)' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="application"
        aria-label={"Network topology canvas"}
      >
        <defs>
          <pattern id="grid-minor" width={GRID * 2} height={GRID * 2} patternUnits="userSpaceOnUse">
            <path d={`M ${GRID * 2} 0 L 0 0 0 ${GRID * 2}`} fill="none" stroke="var(--grid-line)" strokeWidth={1} />
          </pattern>
          <pattern id="grid-major" width={GRID * 10} height={GRID * 10} patternUnits="userSpaceOnUse">
            <rect width={GRID * 10} height={GRID * 10} fill="url(#grid-minor)" />
            <path d={`M ${GRID * 10} 0 L 0 0 0 ${GRID * 10}`} fill="none" stroke="var(--grid-line)" strokeWidth={2.5} opacity={0.75} />
          </pattern>
        </defs>

        <rect
          data-bg="true"
          x={viewBox.x - 5000}
          y={viewBox.y - 5000}
          width={viewBox.w + 10000}
          height={viewBox.h + 10000}
          fill="url(#grid-major)"
        />

        {edges.map((edge) => (
          <ConnectionEdge key={edge.id} edge={edge} />
        ))}

        {nodes.map((node) => (
          <DeviceNode key={node.id} node={node} svgRef={svgRef} />
        ))}

        {sourceNode && cursor && (
          <line
            x1={sourceNode.x}
            y1={sourceNode.y}
            x2={cursor.x}
            y2={cursor.y}
            stroke="var(--warn)"
            strokeWidth={2}
            strokeDasharray="6 4"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {activePackets.map((pkt) => (
          <PacketAnimation key={pkt.id} animatedPacket={pkt} />
        ))}
      </svg>

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-xs rounded-md border border-line-1 bg-surface-1/85 px-4 py-3 text-center shadow-panel">
            <p className="text-xs font-semibold text-ink-1">{"Empty canvas"}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-3">{"Place two devices from the library, connect them with the Connect tool (C), then run a scenario."}</p>
          </div>
        </div>
      )}

      {(selectedNodeId || selectedEdgeId) && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-sm border border-line-1 bg-surface-1/90 px-2 py-1 text-[10px] text-ink-2 shadow-panel">
          {"Press Delete to remove the selection, Esc to cancel."}
        </div>
      )}

      <CanvasToolbar
        onZoomIn={() => zoomAt(1.2)}
        onZoomOut={() => zoomAt(1 / 1.2)}
        onFitView={fitView}
        onResetView={() => setViewBox({ x: 0, y: 0, w: BASE_W, h: BASE_H })}
      />
    </div>
  );
}
