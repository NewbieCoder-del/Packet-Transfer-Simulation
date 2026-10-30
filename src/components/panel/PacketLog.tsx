import { useEffect, useRef } from 'react';
import { useStore } from '../../store';

export default function PacketLog() {
  const logs = useStore((s) => s.logs);
  const t = useStore((s) => s.t);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  if (logs.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
      {logs.map((log) => (
        <div
          key={log.id}
          className="text-xs font-mono px-2 py-1 rounded bg-gray-800/50"
        >
          <span className="text-gray-500 mr-2">{t['log.timePrefix']}{log.time}</span>
          <span
            className={
              log.message.includes('[ARP]')
                ? 'text-orange-400'
                : log.message.includes('[ICMP]')
                ? 'text-cyan-400'
                : log.message.includes('[TCP]')
                ? 'text-blue-400'
                : log.message.includes('[DNS]')
                ? 'text-purple-400'
                : log.message.includes('[HTTP]')
                ? 'text-green-400'
                : 'text-gray-300'
            }
          >
            {log.message}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
