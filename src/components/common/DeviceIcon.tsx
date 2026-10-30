import type { DeviceType } from '../../types/network';

/**
 * Line-art glyphs drawn on a 24x24 grid, stroke-only so they inherit currentColor
 * and stay crisp at canvas zoom levels.
 */
function GlyphPaths({ type }: { type: DeviceType }) {
  switch (type) {
    case 'host':
      return (
        <>
          <rect x="3" y="4.5" width="18" height="12" rx="2" />
          <path d="M8.5 8.5h7M8.5 11.5h4.5" />
          <path d="M12 16.5v3.5M8.5 20h7" />
        </>
      );
    case 'web-server':
      return (
        <>
          <rect x="3" y="4" width="18" height="7" rx="2" />
          <rect x="3" y="13" width="18" height="7" rx="2" />
          <path d="M10 7.5h8M10 16.5h8" />
          <circle cx="6.5" cy="7.5" r="1.1" />
          <circle cx="6.5" cy="16.5" r="1.1" />
        </>
      );
    case 'switch':
      return (
        <>
          <rect x="2.5" y="7.5" width="19" height="9" rx="2" />
          <path d="M6 14.5v-3M9.5 14.5v-3M13 14.5v-3M16.5 14.5v-3" />
          <path d="M4.5 10.5h15" opacity="0.45" />
        </>
      );
    case 'router':
      return (
        <>
          <circle cx="12" cy="15" r="4" />
          <path d="M12 11V5M12 5l-2 2M12 5l2 2" />
          <path d="M8 15H2.5M8 15l-2-2M8 15l-2 2" opacity="0.75" />
          <path d="M16 15h5.5M16 15l2-2M16 15l2 2" opacity="0.75" />
        </>
      );
    case 'dns-server':
      return (
        <>
          <rect x="3" y="3.5" width="13" height="13" rx="2" />
          <path d="M6 7h7M6 10h5" />
          <circle cx="16" cy="16" r="4.5" />
          <path d="M19.4 19.4L22 22" />
        </>
      );
  }
}

interface Props {
  type: DeviceType;
  size?: number;
  className?: string;
}

export default function DeviceIcon({ type, size = 20, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      style={{ flex: '0 0 auto' }}
    >
      <GlyphPaths type={type} />
    </svg>
  );
}

interface CanvasProps extends Props {
  x: number;
  y: number;
}

/** Same glyph as a nested SVG so it can be positioned inside the topology canvas. */
export function DeviceIconSvg({ type, x, y, size = 24 }: CanvasProps) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <GlyphPaths type={type} />
      </g>
    </svg>
  );
}
