import { useState } from 'react';
import { DEVICE_DEFAULTS, DEVICE_ORDER, type DeviceCategory, type DeviceType } from '../../types/network';
import { useStore } from '../../store';
import DeviceIcon from '../common/DeviceIcon';
import { Button, SectionTitle } from '../common/ui';

const CATEGORY_LABEL: Record<DeviceCategory, string> = {
  end: 'End devices',
  infrastructure: 'Network devices',
  service: 'Servers',
};

const CATEGORIES: DeviceCategory[] = ['end', 'infrastructure', 'service'];

const HELP_STEPS = [
  'Drag a device onto the canvas, or click it in the library and then click where you want it.',
  'Press C (or use Connect) and click two devices to link them.',
  'Pick a scenario in the toolbar - it runs immediately.',
  'Use Step to advance one event, or change speed with 0.5x-4x.',
  'Click a device or link to inspect it on the right. Press F to fit the view.',
];

export default function DevicePalette() {
  const canvasTool = useStore((s) => s.canvasTool);
  const setCanvasTool = useStore((s) => s.setCanvasTool);
  const pendingDeviceType = useStore((s) => s.pendingDeviceType);
  const setPendingDeviceType = useStore((s) => s.setPendingDeviceType);
  const clearAll = useStore((s) => s.clearAll);
  const nodeCount = useStore((s) => s.nodes.length);

  const [showHelp, setShowHelp] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleDragStart = (e: React.DragEvent, type: DeviceType) => {
    e.dataTransfer.setData('deviceType', type);
    e.dataTransfer.effectAllowed = 'copy';
    setPendingDeviceType(type);
  };

  const isConnectMode = canvasTool === 'connect';

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto border-r border-line-1 bg-surface-1 p-3">
      <SectionTitle>{"Device Library"}</SectionTitle>

      <div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          aria-expanded={showHelp}
          className="flex w-full items-center gap-1.5 text-left text-[11px] font-semibold text-accent hover:brightness-125"
        >
          <span className="font-mono">{showHelp ? '▾' : '▸'}</span>
          {"How to Use"}
        </button>
        {showHelp && (
          <ol className="mt-2 list-decimal space-y-1 rounded-md border border-line-1 bg-surface-2 p-2.5 pl-6 text-[11px] leading-relaxed text-ink-2">
            {HELP_STEPS.map((step) => (
              <li key={step}>{step}</li>
            )}
          </ol>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {CATEGORIES.map((category) => {
          const types = DEVICE_ORDER.filter((type) => DEVICE_DEFAULTS[type].category === category);
          return (
            <div key={category}>
              <SectionTitle>{CATEGORY_LABEL[category]}</SectionTitle>
              <div className="flex flex-col gap-1.5">
                {types.map((type) => {
                  const meta = DEVICE_DEFAULTS[type];
                  const armed = pendingDeviceType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      draggable
                      onDragStart={(e) => handleDragStart(e, type)}
                      onDragEnd={() => setPendingDeviceType(null)}
                      onClick={() => setPendingDeviceType(armed ? null : type)}
                      aria-pressed={armed}
                      title={"Click to arm, then click the canvas — or drag onto it"}
                      className={`flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors
                        cursor-grab active:cursor-grabbing
                        ${
                          armed
                            ? 'border-accent bg-accent/15'
                            : 'border-line-1 bg-surface-2 hover:border-line-2 hover:bg-surface-3'
                        }`}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm"
                        style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                      >
                        <DeviceIcon type={type} size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-ink-1">
                          {meta.label}
                        </span>
                        <span className="block truncate text-[10px] text-ink-3">{meta.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p
        className={`rounded-md border px-2.5 py-2 text-[11px] leading-snug ${
          pendingDeviceType
            ? 'border-accent/40 bg-accent/10 text-ink-1'
            : 'border-dashed border-line-1 text-ink-3'
        }`}
      >
        {pendingDeviceType ? "Click anywhere on the canvas to place this device." : "Drag a device onto the canvas, or click it to arm placement."}
      </p>

      <div className="mt-auto flex flex-col gap-2 border-t border-line-1 pt-3">
        <Button
          variant={isConnectMode ? 'primary' : 'default'}
          block
          onClick={() => setCanvasTool(isConnectMode ? 'select' : 'connect')}
          aria-pressed={isConnectMode}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M9 15l6-6" />
            <path d="M13.5 7.5l1.8-1.8a3.2 3.2 0 0 1 4.5 4.5l-1.8 1.8M10.5 16.5l-1.8 1.8a3.2 3.2 0 0 1-4.5-4.5l1.8-1.8" />
          </svg>
          {isConnectMode ? "Click a second device" : "Connect devices"}
        </Button>

        <Button
          variant={confirmClear ? 'danger' : 'ghost'}
          block
          disabled={nodeCount === 0}
          onClick={() => {
            if (confirmClear) {
              clearAll();
              setConfirmClear(false);
            } else {
              setConfirmClear(true);
              window.setTimeout(() => setConfirmClear(false), 3000);
            }
          }}
        >
          {confirmClear ? "Click again to delete everything" : "Clear canvas"}
        </Button>
      </div>
    </div>
  );
}
