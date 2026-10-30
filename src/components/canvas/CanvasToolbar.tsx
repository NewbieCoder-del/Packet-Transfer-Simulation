import type { CanvasTool } from '../../store/ui-slice';
import { useStore } from '../../store';
import { TipButton } from '../common/ui';
const TOOL_LABEL = { select: 'Select / move', pan: 'Pan', connect: 'Connect' } as const;

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onResetView: () => void;
}

const SelectIcon = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2.5 1.2l9.2 5.1-4 1.1-1.3 4z" />
  </svg>
);

const PanIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-.5V6a1.5 1.5 0 0 1 3 0v7.5c0 4-2.5 6.5-6 6.5s-5-2-6.5-4.5L5 13.5a1.5 1.5 0 0 1 2.6-1.5L8 13" />
  </svg>
);

const LinkIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M9 15l6-6" />
    <path d="M13.5 7.5l1.8-1.8a3.2 3.2 0 0 1 4.5 4.5l-1.8 1.8M10.5 16.5l-1.8 1.8a3.2 3.2 0 0 1-4.5-4.5l1.8-1.8" />
  </svg>
);

const GridIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </svg>
);

const ZoomInIcon = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="7" r="5.2" />
    <path d="M7 4.6v4.8M4.6 7h4.8M10.8 10.8L14 14" strokeLinecap="round" />
  </svg>
);

const ZoomOutIcon = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="7" r="5.2" />
    <path d="M4.6 7h4.8M10.8 10.8L14 14" strokeLinecap="round" />
  </svg>
);

const FitIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  </svg>
);

const ResetIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10a8 8 0 1 1 1.2 6.9" />
    <path d="M4 4v6h6" />
  </svg>
);

const TOOLS: { id: CanvasTool; icon: typeof SelectIcon; shortcut: string }[] = [
  { id: 'select', icon: SelectIcon, shortcut: 'V' },
  { id: 'pan', icon: PanIcon, shortcut: 'H' },
  { id: 'connect', icon: LinkIcon, shortcut: 'C' },
];

export default function CanvasToolbar({ onZoomIn, onZoomOut, onFitView, onResetView }: Props) {
  const canvasTool = useStore((s) => s.canvasTool);
  const setCanvasTool = useStore((s) => s.setCanvasTool);
  const pendingDeviceType = useStore((s) => s.pendingDeviceType);
  const snapToGrid = useStore((s) => s.snapToGrid);
  const setSnapToGrid = useStore((s) => s.setSnapToGrid);
  const zoom = useStore((s) => s.canvasZoom);

  return (
    <div
      role="toolbar"
      aria-label={"Canvas tools"}
      className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-line-1 bg-surface-1/95 p-1 shadow-panel backdrop-blur-sm"
    >
      {TOOLS.map((tool) => (
        <TipButton
          key={tool.id}
          label={TOOL_LABEL[tool.id]}
          shortcut={tool.shortcut}
          active={canvasTool === tool.id && !pendingDeviceType}
          onClick={() => setCanvasTool(tool.id)}
        >
          {tool.icon}
        </TipButton>
      ))}

      <div className="mx-1 h-5 w-px bg-line-1" />

      <TipButton
        label={"Snap to grid"}
        active={snapToGrid}
        onClick={() => setSnapToGrid(!snapToGrid)}
      >
        {GridIcon}
      </TipButton>

      <div className="mx-1 h-5 w-px bg-line-1" />

      <TipButton label={"Zoom Out"} shortcut="]" onClick={onZoomOut}>
        {ZoomOutIcon}
      </TipButton>
      <span className="w-11 text-center font-mono text-[10px] text-ink-3">
        {Math.round(zoom * 100)}%
      </span>
      <TipButton label={"Zoom In"} shortcut="[" onClick={onZoomIn}>
        {ZoomInIcon}
      </TipButton>

      <div className="mx-1 h-5 w-px bg-line-1" />

      <TipButton label={"Fit to topology"} shortcut="F" onClick={onFitView}>
        {FitIcon}
      </TipButton>
      <TipButton label={"Reset view"} onClick={onResetView}>
        {ResetIcon}
      </TipButton>
    </div>
  );
}
