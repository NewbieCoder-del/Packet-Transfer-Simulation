import { useRef, useCallback } from 'react';

interface Props {
  /** 'x' drags sideways (column divider), 'y' drags vertically (dock divider). */
  axis: 'x' | 'y';
  onDelta: (dx: number, dy: number) => void;
  onKeyStep?: (step: number) => void;
  label: string;
}

export default function ResizeHandle({ axis, onDelta, onKeyStep, label }: Props) {
  const last = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      last.current = { x: e.clientX, y: e.clientY };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!last.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      onDelta(dx, dy);
    },
    [onDelta]
  );

  const handlePointerUp = useCallback(() => {
    last.current = null;
  }, []);

  return (
    <div
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-label={label}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={(e) => {
        if (!onKeyStep) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') onKeyStep(-12);
        else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') onKeyStep(12);
        else return;
        e.preventDefault();
      }}
      className={`group flex shrink-0 items-center justify-center bg-surface-1 transition-colors
        hover:bg-accent/40 focus-visible:bg-accent/40
        ${axis === 'x' ? 'w-1.5 cursor-col-resize' : 'h-1.5 w-full cursor-row-resize'}`}
    >
      <div
        className={`rounded-full bg-line-2 opacity-60 group-hover:opacity-100 ${
          axis === 'x' ? 'h-8 w-0.5' : 'h-0.5 w-8'
        }`}
      />
    </div>
  );
}
