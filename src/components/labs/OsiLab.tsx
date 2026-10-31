import { useMemo, useState } from 'react';
import { buildOsiSteps, type OsiConfig } from '../../labs/osi';
import { getLab } from '../../labs/registry';
import LabFrame, { Field, NumberField, labInputClass } from './LabFrame';
import { Badge } from '../common/ui';

const LAYERS = [
  { layer: 7, name: 'Application', pdu: 'Data' },
  { layer: 6, name: 'Presentation', pdu: 'Data' },
  { layer: 5, name: 'Session', pdu: 'Data' },
  { layer: 4, name: 'Transport', pdu: 'Segment / Datagram' },
  { layer: 3, name: 'Network', pdu: 'Packet' },
  { layer: 2, name: 'Data Link', pdu: 'Frame' },
  { layer: 1, name: 'Physical', pdu: 'Bits' },
];

export default function OsiLab() {
  const lab = getLab('osi');
  const [message, setMessage] = useState('Hello, network!');
  const [transport, setTransport] = useState<'tcp' | 'udp'>('tcp');
  const [srcIp, setSrcIp] = useState('192.168.1.10');
  const [dstIp, setDstIp] = useState('192.168.1.20');
  const [srcPort, setSrcPort] = useState(49152);
  const [dstPort, setDstPort] = useState(80);

  const config = useMemo<OsiConfig>(
    () => ({ message, transport, srcIp, dstIp, srcPort, dstPort }),
    [message, transport, srcIp, dstIp, srcPort, dstPort]
  );
  const steps = useMemo(() => buildOsiSteps(config), [config]);

  const bytes = new TextEncoder().encode(message || 'Hello, network!').length;
  const transportHeader = transport === 'tcp' ? 20 : 8;
  const segments = [
    { key: 'payload', label: `Data ${bytes} B`, units: bytes, tone: 'bg-ink-2/70' },
    { key: 'transport', label: `${transport.toUpperCase()} ${transportHeader} B`, units: transportHeader, tone: 'bg-accent/70' },
    { key: 'ip', label: 'IPv4 20 B', units: 20, tone: 'bg-warn/70' },
    { key: 'eth', label: 'Ethernet 14 B + FCS 4 B', units: 18, tone: 'bg-ok/70' },
  ];

  return (
    <LabFrame
      lab={lab}
      steps={steps}
      configKey={JSON.stringify(config)}
      config={
        <>
          <Field label="Message" hint="UTF-8 payload carried by the application layer">
            <input value={message} onChange={(event) => setMessage(event.target.value)} className={labInputClass} />
          </Field>
          <Field label="Transport protocol">
            <select
              value={transport}
              onChange={(event) => setTransport(event.target.value as 'tcp' | 'udp')}
              className={labInputClass}
            >
              <option value="tcp">TCP - 20-byte header, connection oriented</option>
              <option value="udp">UDP - 8-byte header, connectionless</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Source IP">
              <input value={srcIp} onChange={(event) => setSrcIp(event.target.value)} className={labInputClass} />
            </Field>
            <Field label="Destination IP">
              <input value={dstIp} onChange={(event) => setDstIp(event.target.value)} className={labInputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Source port" value={srcPort} min={1} max={65535} onChange={setSrcPort} />
            <NumberField label="Destination port" value={dstPort} min={1} max={65535} onChange={setDstPort} />
          </div>
        </>
      }
      renderVisual={(index) => {
        const encapsulating = index <= 6;
        const activeLayer = encapsulating ? 7 - index : index - 6;
        const present = encapsulating
          ? activeLayer >= 5
            ? 1
            : activeLayer === 4
              ? 2
              : activeLayer === 3
                ? 3
                : 4
          : activeLayer <= 2
            ? 4
            : activeLayer === 3
              ? 3
              : activeLayer === 4
                ? 2
                : 1;

        return (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-ink-1">
                {encapsulating ? 'Sender - encapsulation, Layer 7 → 1' : 'Receiver - decapsulation, Layer 1 → 7'}
              </span>
              <Badge tone={encapsulating ? 'accent' : 'ok'}>Layer {activeLayer}</Badge>
            </div>

            <div className="flex flex-col gap-1">
              {LAYERS.map((entry) => {
                const active = entry.layer === activeLayer;
                const reached = encapsulating ? entry.layer >= activeLayer : entry.layer <= activeLayer;
                return (
                  <div
                    key={entry.layer}
                    className={`flex items-center gap-2 rounded-sm border px-2 py-1 transition-colors ${
                      active
                        ? 'border-accent bg-accent/15'
                        : reached
                          ? 'border-line-1 bg-surface-2'
                          : 'border-line-1 bg-surface-2 opacity-35'
                    }`}
                  >
                    <span className={`w-10 font-mono text-[10px] ${active ? 'text-accent' : 'text-ink-3'}`}>
                      L{entry.layer}
                    </span>
                    <span className={`flex-1 text-[11px] ${active ? 'font-semibold text-ink-1' : 'text-ink-2'}`}>
                      {entry.name}
                    </span>
                    <span className="font-mono text-[10px] text-ink-3">{entry.pdu}</span>
                  </div>
                );
              })}
            </div>

            <div>
              <div className="mb-1 flex justify-between text-[10px] text-ink-3">
                <span>Frame contents at this layer</span>
                <span className="font-mono">{present} of 4 parts present</span>
              </div>
              <div className="flex h-8 gap-1 overflow-hidden rounded-sm border border-line-1 bg-surface-2 p-1">
                {segments.map((segment, i) => (
                  <div
                    key={segment.key}
                    title={segment.label}
                    style={{ flexGrow: Math.max(segment.units, 2) }}
                    className={`flex min-w-0 items-center justify-center rounded-xs px-1 text-[9px] font-medium text-surface-0 transition-opacity ${
                      segment.tone
                    } ${i < present ? 'opacity-100' : 'opacity-15'}`}
                  >
                    <span className="truncate">{segment.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
