import { useState, type ReactNode } from 'react';
import { useStore } from '../../store';
import type { CanvasTool } from '../../store/ui-slice';

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const tools: { id: CanvasTool; icon: ReactNode; shortcut: string; labelKey: 'tool.select' | 'tool.pan' }[] = [
  {
    id: 'select',
    shortcut: 'V',
    labelKey: 'tool.select',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 1l10 5.5L7.5 8 6 13z" />
      </svg>
    ),
  },
  {
    id: 'pan',
    shortcut: 'G',
    labelKey: 'tool.pan',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.5 1.5a1 1 0 0 1 2 0V6h1.5V3.5a1 1 0 0 1 2 0V6H13a1 1 0 0 1 2 0v4.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 4 10.5V8a1 1 0 0 1 2 0v.5h.5V1.5z" />
      </svg>
    ),
  },
];

const ZoomInIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="7" r="5.5" />
    <line x1="7" y1="4.5" x2="7" y2="9.5" />
    <line x1="4.5" y1="7" x2="9.5" y2="7" />
    <line x1="11" y1="11" x2="14.5" y2="14.5" />
  </svg>
);

const ZoomOutIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="7" r="5.5" />
    <line x1="4.5" y1="7" x2="9.5" y2="7" />
    <line x1="11" y1="11" x2="14.5" y2="14.5" />
  </svg>
);

export default function CanvasToolbar({ onZoomIn, onZoomOut }: Props) {
  const canvasTool = useStore((s) => s.canvasTool);
  const setCanvasTool = useStore((s) => s.setCanvasTool);
  const t = useStore((s) => s.t);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const zoomButtons = [
    { id: 'zoomIn', icon: ZoomInIcon, labelKey: 'tool.zoomIn' as const, shortcut: '[', onClick: onZoomIn },
    { id: 'zoomOut', icon: ZoomOutIcon, labelKey: 'tool.zoomOut' as const, shortcut: ']', onClick: onZoomOut },
  ];

  return (
    <div
      style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
      className="flex items-center gap-1 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-1"
    >
      {tools.map((tool) => (
        <div
          key={tool.id}
          style={{ position: 'relative' }}
          onMouseEnter={() => setHoveredItem(tool.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <button
            onClick={() => setCanvasTool(tool.id)}
            className={`w-9 h-9 flex items-center justify-center rounded-md transition-colors ${
              canvasTool === tool.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {tool.icon}
          </button>
          {hoveredItem === tool.id && (
            <div
              style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '0.5rem', pointerEvents: 'none' }}
              className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 whitespace-nowrap"
            >
              {t[tool.labelKey]} <kbd className="ml-1 px-1 py-0.5 bg-gray-700 rounded text-[10px] text-gray-400 font-mono">{tool.shortcut}</kbd>
            </div>
          )}
        </div>
      ))}

      {/* Separator */}
      <div className="w-px h-6 bg-gray-700 mx-0.5" />

      {zoomButtons.map((btn) => (
        <div
          key={btn.id}
          style={{ position: 'relative' }}
          onMouseEnter={() => setHoveredItem(btn.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <button
            onClick={btn.onClick}
            className="w-9 h-9 flex items-center justify-center rounded-md transition-colors text-gray-400 hover:bg-gray-700 hover:text-gray-200"
          >
            {btn.icon}
          </button>
          {hoveredItem === btn.id && (
            <div
              style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '0.5rem', pointerEvents: 'none' }}
              className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 whitespace-nowrap"
            >
              {t[btn.labelKey]} <kbd className="ml-1 px-1 py-0.5 bg-gray-700 rounded text-[10px] text-gray-400 font-mono">{btn.shortcut}</kbd>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
