import { useState } from 'react';
import { useStore } from '../../store';
import { DEVICE_DEFAULTS, DEVICE_ORDER, type NetworkNode } from '../../types/network';
import { isSameSubnet } from '../../utils/ip';
import DeviceIcon from '../common/DeviceIcon';
import { Badge, Button, Card, KeyValue, SectionTitle } from '../common/ui';

function TableCard({ rows, empty }: { rows: [string, string][]; empty: string }) {
  return (
    <Card className="divide-y divide-line-1">
      {rows.length === 0 ? (
        <p className="px-2.5 py-2 text-[11px] text-ink-3">{empty}</p>
      ) : (
        rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
            <span className="font-mono text-[11px] text-ink-1">{k}</span>
            <span className="font-mono text-[11px] text-ink-2">{v}</span>
          </div>
        ))
      )}
    </Card>
  );
}

function DeviceInspector({ node }: { node: NetworkNode }) {
  const edges = useStore((s) => s.edges);
  const nodes = useStore((s) => s.nodes);
  const updateNodeLabel = useStore((s) => s.updateNodeLabel);
  const removeNode = useStore((s) => s.removeNode);
  const selectEdge = useStore((s) => s.selectEdge);

  const meta = DEVICE_DEFAULTS[node.type];
  const [name, setName] = useState(node.label);
  const [nameKey, setNameKey] = useState(node.id);
  if (nameKey !== node.id) {
    setNameKey(node.id);
    setName(node.label);
  }

  const links = edges.filter((e) => e.from.nodeId === node.id || e.to.nodeId === node.id);
  const arpRows = Object.entries(node.arpTable).map(([ip, mac]) => [ip, mac] as [string, string]);
  const macRows = Object.entries(node.macTable ?? {}).map(([mac, port]) => [mac, port] as [string, string]);
  const routeRows = (node.routingTable ?? []).map(
    (r) => [`${r.destination}/${r.mask}`, `${r.gateway} · ${r.interfaceId}`] as [string, string]
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
          {node.interfaces.map((iface, idx) => (
            <Card key={iface.id} className="px-2.5 py-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-ink-2">
                  {"Port"} {idx + 1}
                </span>
                <span className="font-mono text-[10px] text-ink-3">{iface.id.slice(0, 6)}</span>
              </div>
              <KeyValue k={"MAC"} v={iface.mac} mono />
              {iface.ip && <KeyValue k={"IP"} v={iface.ip} mono />}
              {iface.subnetMask && <KeyValue k={"Mask"} v={iface.subnetMask} mono />}
              {!iface.ip && <p className="pt-0.5 text-[11px] text-ink-3">{'Layer 2 port - no IP address'}</p>}
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle right={<span className="font-mono text-[10px] text-ink-3">{arpRows.length}</span>}>
          {"ARP Table"}
        </SectionTitle>
        <TableCard rows={arpRows} empty={"No entries yet"} />
      </div>

      {node.macTable && (
        <div>
          <SectionTitle right={<span className="font-mono text-[10px] text-ink-3">{macRows.length}</span>}>
            {"MAC Address Table"}
          </SectionTitle>
          <TableCard rows={macRows} empty={"No learned entries yet — switching is enabled in Phase 3"} />
        </div>
      )}

      {node.routingTable && (
        <div>
          <SectionTitle>{"Routing Table"}</SectionTitle>
          <TableCard rows={routeRows} empty={"No entries yet"} />
        </div>
      )}

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
