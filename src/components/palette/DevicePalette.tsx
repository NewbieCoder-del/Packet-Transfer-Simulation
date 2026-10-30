import { useState } from 'react';
import { DEVICE_DEFAULTS, type DeviceType } from '../../types/network';
import { useStore } from '../../store';
import type { Translations } from '../../i18n';

const deviceTypes: DeviceType[] = ['host', 'switch', 'router', 'dns-server', 'web-server'];

const DEVICE_TYPE_KEYS: Record<DeviceType, keyof Translations> = {
  'host': 'device.host',
  'switch': 'device.switch',
  'router': 'device.router',
  'dns-server': 'device.dnsServer',
  'web-server': 'device.webServer',
};

const HELP_STEP_KEYS: (keyof Translations)[] = [
  'help.step1', 'help.step2', 'help.step3', 'help.step4', 'help.step5',
];

export default function DevicePalette() {
  const connectionMode = useStore((s) => s.connectionMode);
  const setConnectionMode = useStore((s) => s.setConnectionMode);
  const t = useStore((s) => s.t);
  const [showHelp, setShowHelp] = useState(false);

  const handleDragStart = (e: React.DragEvent, type: DeviceType) => {
    e.dataTransfer.setData('deviceType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-52 bg-gray-900 border-r border-gray-700 flex flex-col p-3 gap-3">
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="text-left text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
      >
        {showHelp ? `▾ ${t['help.title']}` : `▸ ${t['help.title']}`}
      </button>

      {showHelp && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
            {HELP_STEP_KEYS.map((key) => (
              <li key={key} className="leading-relaxed">{t[key]}</li>
            ))}
          </ol>
        </div>
      )}

      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t['devices.heading']}</h2>

      <div className="flex flex-col gap-2">
        {deviceTypes.map((type) => {
          const d = DEVICE_DEFAULTS[type];
          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-800 border border-gray-700
                         cursor-grab active:cursor-grabbing hover:border-gray-500 hover:bg-gray-750
                         transition-colors select-none"
            >
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center text-lg"
                style={{ backgroundColor: d.color + '22', color: d.color }}
              >
                {d.icon}
              </div>
              <span className="text-sm text-gray-200">{t[DEVICE_TYPE_KEYS[type]]}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-auto border-t border-gray-700 pt-3">
        <button
          onClick={() => setConnectionMode(!connectionMode)}
          className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            connectionMode
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
          }`}
        >
          {connectionMode ? `🔗 ${t['devices.connecting']}` : `🔗 ${t['devices.connectMode']}`}
        </button>
      </div>
    </div>
  );
}
