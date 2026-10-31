import { useState } from 'react';
import { useStore } from '../../store';
import {
  DEVICE_DEFAULTS,
  DEVICE_ORDER,
  type NetworkInterface,
  type NetworkNode,
} from '../../types/network';
import { isValidIpv4, isValidSubnetMask, maskToPrefix, isSameSubnet } from '../../utils/ip';
import DeviceIcon from '../common/DeviceIcon';
import { Badge, Button, Card, KeyValue, SectionTitle } from '../common/ui';

const inputClass =
  'w-full rounded-sm border border-line-1 bg-surface-2 px-1.5 py-1 font-mono text-[11px] text-ink-1 ' +
  'hover:border-line-2 focus:border-accent focus:outline-none';

function TableCard({ rows, empty }: { rows: [string, string][]; empty: string }) {
  return (
    <Card className="divide-y divide-line-1">
      {rows.length === 0 ? (
        <p className="px-2.5 py-2 text-[11px] text-ink-3">{empty}</p>
      ) : (
        rows.map(([k, v], i) => (
          <div key={`${k}-${i}`} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
            <span className="font-mono text-[11px] text-ink-1">{k}</span>
            <span className="font-mono text-[11px] text-ink-2">{v}</span>
          </div>
        ))
      )}
    </Card>
  );
}

function ErrorNote({ text }: { text: string }) {
  return <p className="pt-1 text-[10px] leading-snug text-bad">{text}</p>;
}

function InterfaceCard({ node, iface }: { node: NetworkNode; iface: NetworkInterface }) {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const setInterfaceAddress = useStore((s) => s.setInterfaceAddress);

  const layer3 = DEVICE_DEFAULTS[node.type].layer3;
  const [ip, setIp] = useState(iface.ip ?? '');
  const [mask, setMask] = useState(iface.subnetMask ?? '255.255.255.0');
  const [error, setError] = useState<string | null>(null);

  const edge = edges.find((e) => e.id === iface.connectedEdgeId);
  const peerId = edge && (edge.from.nodeId === node.id ? edge.to.nodeId : edge.from.nodeId);
  const peer = nodes.find((n) => n.id === peerId);
  const up = edge?.status ?? null;

  const commit = () => {
    const nextIp = ip.trim();
    const nextMask = mask.trim();
    if (!isValidIpv4(nextIp)) {
      setError('Not a valid IPv4 address (e.g. 192.168.1.10)');
      return;
    }
    if (!isValidSubnetMask(nextMask)) {
      setError('Not a valid subnet mask (contiguous bits, e.g. 255.255.255.0)');
      return;
    }
    if (!setInterfaceAddress(node.id, iface.id, nextIp, nextMask)) {
      setError('Another interface already uses this address');
      return;
    }
    setError(null);
  };

  return (
    <Card className="px-2.5 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-semibold text-ink-2">{iface.name}</span>
        {edge ? (
          <Badge tone={up === 'up' ? 'ok' : 'bad'}>{peer?.label ?? 'link'}</Badge>
        ) : (
          <Badge tone="neutral">{"free"}</Badge>
        )}
      </div>
      <KeyValue k={"MAC"} v={iface.mac} mono />

      {layer3 ? (
        <div className="mt-1.5 flex flex-col gap-1.5">
          <label className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-ink-3">{"IPv4"}</span>
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              placeholder="0.0.0.0"
              aria-label={`IP address of ${iface.name}`}
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-ink-3">{"Mask"}</span>
            <input
              value={mask}
              onChange={(e) => setMask(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              placeholder="255.255.255.0"
              aria-label={`Subnet mask of ${iface.name}`}
              className={inputClass}
            />
          </label>
          {ip && mask && isValidIpv4(ip.trim()) && isValidSubnetMask(mask.trim()) && (
            <p className="text-[10px] text-ink-3">
              {`/${maskToPrefix(mask.trim())} · network ${(ip.trim().split('.').slice(0, 3).join('.'))}`}
            </p>
          )}
          {error && <ErrorNote text={error} />}
        </div>
      ) : (
        <p className="pt-0.5 text-[11px] text-ink-3">{"Layer 2 port - switching only, no IP address"}</p>
      )}
    </Card>
  );
}

function GatewayField({ node }: { node: NetworkNode }) {
  const nodes = useStore((s) => s.nodes);
  const setGateway = useStore((s) => s.setGateway);
  const [value, setValue] = useState(node.gateway ?? '');
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const next = value.trim();
    if (!next) {
      setGateway(node.id, undefined);
      setError(null);
      return;
    }
    if (!isValidIpv4(next)) {
      setError('Not a valid IPv4 address');
      return;
    }
    const router = nodes.find((n) => n.interfaces.some((iface) => iface.ip === next));
    if (!router) {
      setError('No device in this topology owns that address');
      return;
    }
    setGateway(node.id, next);
    setError(null);
  };

  return (
    <div>
      <SectionTitle>{"Default Gateway"}</SectionTitle>
      <Card className="px-2.5 py-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          placeholder={"none - clears when empty"}
          aria-label="Default gateway"
          className={inputClass}
        />
        <p className="pt-1 text-[10px] leading-snug text-ink-3">
          {"Off-subnet traffic is sent here. Set it to the router interface on this device's subnet."}
        </p>
        {error && <ErrorNote text={error} />}
      </Card>
    </div>
  );
}

function StaticRoutes({ node }: { node: NetworkNode }) {
  const addRoute = useStore((s) => s.addRoute);
  const removeRoute = useStore((s) => s.removeRoute);
  const [destination, setDestination] = useState('');
  const [mask, setMask] = useState('255.255.255.0');
  const [gateway, setGateway] = useState('');
  const [interfaceId, setInterfaceId] = useState(node.interfaces.find((i) => i.ip)?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  const rows = (node.routingTable ?? []).map(
    (r) =>
      [
        `${r.destination}/${maskToPrefix(r.mask)}`,
        `via ${r.gateway} · ${node.interfaces.find((i) => i.id === r.interfaceId)?.name ?? '?'}`,
      ] as [string, string]
  );

  const submit = () => {
    if (!isValidIpv4(destination.trim())) {
      setError('Destination must be a valid network address');
      return;
    }
    if (!isValidSubnetMask(mask.trim())) {
      setError('Mask must be contiguous, e.g. 255.255.255.0');
      return;
    }
    if (!isValidIpv4(gateway.trim())) {
      setError('Next-hop gateway must be a valid IPv4 address');
      return;
    }
    const egress = node.interfaces.find((iface) => iface.id === interfaceId);
    if (!egress) {
      setError('Pick the outgoing interface for this route');
      return;
    }
    addRoute(node.id, {
      destination: destination.trim(),
      mask: mask.trim(),
      gateway: gateway.trim(),
      interfaceId,
    });
    setDestination('');
    setGateway('');
    setError(null);
  };

  return (
    <div>
      <SectionTitle right={<span className="font-mono text-[10px] text-ink-3">{rows.length}</span>}>
        {"Static Routes"}
      </SectionTitle>
      <Card className="divide-y divide-line-1">
        {rows.length === 0 ? (
          <p className="px-2.5 py-2 text-[11px] text-ink-3">
            {"No static routes. Connected subnets always win over these entries."}
          </p>
        ) : (
          rows.map((row, i) => (
            <div key={`${row[0]}-${i}`} className="flex items-center gap-2 px-2.5 py-1.5">
              <span className="min-w-0 flex-1 font-mono text-[11px] text-ink-1">{row[0]}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-ink-2">{row[1]}</span>
              <button
                onClick={() => removeRoute(node.id, i)}
                aria-label={`Remove route to ${row[0]}`}
                className="shrink-0 rounded-xs border border-line-1 px-1 text-[10px] text-ink-3 hover:border-bad hover:text-bad"
              >
                {"×"}
              </button>
            </div>
          ))
        )}
      </Card>

      <div className="mt-2 flex flex-col gap-1.5 rounded-md border border-line-1 bg-surface-2 p-2">
        <div className="flex gap-1.5">
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={"network, e.g. 10.1.1.0"}
            aria-label="Route destination network"
            className={inputClass}
          />
          <input
            value={mask}
            onChange={(e) => setMask(e.target.value)}
            placeholder={"mask"}
            aria-label="Route destination mask"
            className={`${inputClass} w-28 shrink-0`}
          />
        </div>
        <div className="flex gap-1.5">
          <input
            value={gateway}
            onChange={(e) => setGateway(e.target.value)}
            placeholder={"next hop, e.g. 192.168.9.2"}
            aria-label="Route next-hop gateway"
            className={inputClass}
          />
          <select
            value={interfaceId}
            onChange={(e) => setInterfaceId(e.target.value)}
            aria-label="Route outgoing interface"
            className={`${inputClass} w-32 shrink-0`}
          >
            {node.interfaces.map((iface) => (
              <option key={iface.id} value={iface.id}>
                {iface.name}
              </option>
            ))}
          </select>
        </div>
        <Button block onClick={submit}>
          {"Add static route"}
        </Button>
        {error && <ErrorNote text={error} />}
      </div>
    </div>
  );
}

function DeviceInspector({ node }: { node: NetworkNode }) {
  const edges = useStore((s) => s.edges);
  const nodes = useStore((s) => s.nodes);
  const updateNodeLabel = useStore((s) => s.updateNodeLabel);
  const removeNode = useStore((s) => s.removeNode);
  const selectEdge = useStore((s) => s.selectEdge);

  const meta = DEVICE_DEFAULTS[node.type];
  const isEndDevice = node.type !== 'switch' && node.type !== 'router';
  const [name, setName] = useState(node.label);
  const [nameKey, setNameKey] = useState(node.id);
  if (nameKey !== node.id) {
    setNameKey(node.id);
    setName(node.label);
  }

  const links = edges.filter((e) => e.from.nodeId === node.id || e.to.nodeId === node.id);
  const arpRows = Object.entries(node.arpTable).map(([ip, mac]) => [ip, mac] as [string, string]);
  const macRows = Object.entries(node.macTable ?? {}).map(
    ([mac, entry]) => [mac, node.interfaces.find((i) => i.id === entry.interfaceId)?.name ?? 'port'] as [string, string]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line-1"
          style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
        >
          <DeviceIcon type={node.type} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="device-name">
            {"Device name"}
          </label>
          <input
            id="device-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => updateNodeLabel(node.id, name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setName(node.label);
            }}
            className="w-full rounded-sm border border-line-1 bg-surface-2 px-2 py-1 text-sm text-ink-1 hover:border-line-2 focus:border-accent"
          />
          <div className="mt-1 flex items-center gap-1.5">
            <Badge tone="accent">{node.type.replace('-', ' ')}</Badge>
            <span className="font-mono text-[10px] text-ink-3">{node.id}</span>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>{"Interfaces"}</SectionTitle>
        <div className="flex flex-col gap-1.5">
          {node.interfaces.map((iface) => (
            <InterfaceCard key={`${node.id}-${iface.id}`} node={node} iface={iface} />
          ))}
        </div>
      </div>

      {isEndDevice && <GatewayField key={`gw-${node.id}`} node={node} />}

      <div>
        <SectionTitle right={<span className="font-mono text-[10px] text-ink-3">{arpRows.length}</span>}>
          {"ARP Table"}
        </SectionTitle>
        <TableCard rows={arpRows} empty={"Empty - a scenario resolves the next hop on first use"} />
      </div>

      {node.macTable && (
        <div>
          <SectionTitle right={<span className="font-mono text-[10px] text-ink-3">{macRows.length}</span>}>
            {"MAC Address Table"}
          </SectionTitle>
          <TableCard rows={macRows} empty={"No learned entries yet - run traffic through this switch"} />
        </div>
      )}

      {node.routingTable && <StaticRoutes key={`routes-${node.id}`} node={node} />}

      {node.tcpState && (
        <div>
          <SectionTitle>{"TCP State"}</SectionTitle>
          <Card className="px-2.5 py-2">
            <Badge tone={node.tcpState === 'ESTABLISHED' ? 'ok' : node.tcpState === 'CLOSED' ? 'neutral' : 'warn'}>
              {node.tcpState}
            </Badge>
          </Card>
        </div>
      )}

      <div>
        <SectionTitle right={<span className="font-mono text-[10px] text-ink-3">{links.length}</span>}>
          {"Connections"}
        </SectionTitle>
        <Card className="divide-y divide-line-1">
          {links.length === 0 ? (
            <p className="px-2.5 py-2 text-[11px] text-ink-3">{"Not connected to anything yet"}</p>
          ) : (
            links.map((link) => {
              const peer = nodes.find((n) => n.id === (link.from.nodeId === node.id ? link.to.nodeId : link.from.nodeId));
              return (
                <button
                  key={link.id}
                  onClick={() => selectEdge(link.id)}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-surface-3"
                >
                  {peer && <DeviceIcon type={peer.type} size={14} className="text-ink-3" />}
                  <span className="min-w-0 flex-1 truncate text-[11px] text-ink-1">{peer?.label ?? '—'}</span>
                  <Badge tone={link.status === 'up' ? 'ok' : 'bad'}>{link.status}</Badge>
                </button>
              );
            })
          )}
        </Card>
      </div>

      <Button variant="danger" block onClick={() => removeNode(node.id)}>
        {"Delete device"}
      </Button>
    </div>
  );
}

function LinkInspector({ edgeId }: { edgeId: string }) {
  const edges = useStore((s) => s.edges);
  const nodes = useStore((s) => s.nodes);
  const removeEdge = useStore((s) => s.removeEdge);
  const toggleEdgeStatus = useStore((s) => s.toggleEdgeStatus);

  const edge = edges.find((e) => e.id === edgeId);
  if (!edge) return null;
  const from = nodes.find((n) => n.id === edge.from.nodeId);
  const to = nodes.find((n) => n.id === edge.to.nodeId);
  if (!from || !to) return null;

  const fromIp = from.interfaces.find((i) => i.ip)?.ip;
  const toIp = to.interfaces.find((i) => i.ip)?.ip;
  const sameSubnet = fromIp && toIp ? isSameSubnet(fromIp, toIp) : null;

  const endpoint = (node: NetworkNode) => (
    <div className="flex items-center gap-2">
      <DeviceIcon type={node.type} size={15} className="text-ink-2" />
      <span className="text-xs text-ink-1">{node.label}</span>
      <span className="ml-auto font-mono text-[10px] text-ink-3">
        {node.interfaces.find((i) => i.ip)?.ip ?? 'L2'}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionTitle>{"Connection"}</SectionTitle>
        <Card className="divide-y divide-line-1">
          <div className="px-2.5 py-2">{endpoint(from)}</div>
          <div className="px-2.5 py-2">{endpoint(to)}</div>
          <div className="flex items-center justify-between px-2.5 py-2">
            <span className="text-[11px] text-ink-3">{"Status"}</span>
            <Badge tone={edge.status === 'up' ? 'ok' : 'bad'}>{edge.status}</Badge>
          </div>
          {sameSubnet !== null && (
            <div className="flex items-center justify-between px-2.5 py-2">
              <span className="text-[11px] text-ink-3">{"Same subnet"}</span>
              <span className={`font-mono text-[11px] ${sameSubnet ? 'text-ok' : 'text-warn'}`}>
                {sameSubnet ? "yes" : "no"}
              </span>
            </div>
          )}
        </Card>
      </div>

      <div className="flex gap-2">
        <Button block onClick={() => toggleEdgeStatus(edge.id)}>
          {edge.status === 'up' ? "Bring down" : "Bring up"}
        </Button>
        <Button variant="danger" block onClick={() => removeEdge(edge.id)}>
          {"Delete"}
        </Button>
      </div>
    </div>
  );
}

export default function StatusPanel() {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);
  const nodes = useStore((s) => s.nodes);

  const node = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-1">
      <header className="flex h-9 shrink-0 items-center border-b border-line-1 px-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-3">
          {"Inspector"}
        </h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!node && !selectedEdgeId && (
          <div className="flex flex-col gap-3">
            <p className="rounded-md border border-dashed border-line-1 px-3 py-4 text-center text-[11px] leading-relaxed text-ink-3">
              {"Select a device or a link to inspect it"}
            </p>
            <div>
              <SectionTitle>{"Topology summary"}</SectionTitle>
              <Card className="divide-y divide-line-1">
                {nodes.length === 0 ? (
                  <p className="px-2.5 py-2 text-[11px] text-ink-3">{"No devices placed yet"}</p>
                ) : (
                  DEVICE_ORDER
                    .filter((type) => nodes.some((n) => n.type === type))
                    .map((type) => {
                      const count = nodes.filter((n) => n.type === type).length;
                      return (
                        <div key={type} className="flex items-center gap-2 px-2.5 py-1.5">
                          <DeviceIcon type={type} size={14} className="text-ink-3" />
                          <span className="flex-1 text-[11px] text-ink-2">
                            {DEVICE_DEFAULTS[type].label}
                          </span>
                          <span className="font-mono text-[11px] text-ink-1">{count}</span>
                        </div>
                      );
                    })
                )}
              </Card>
            </div>
          </div>
        )}

        {node && <DeviceInspector node={node} />}
        {!node && selectedEdgeId && <LinkInspector edgeId={selectedEdgeId} />}
      </div>
    </div>
  );
}
