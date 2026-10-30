import { useStore } from '../../store';
import { DEVICE_DEFAULTS } from '../../types/network';
import PacketLog from './PacketLog';

export default function StatusPanel() {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const removeNode = useStore((s) => s.removeNode);
  const removeEdge = useStore((s) => s.removeEdge);
  const toggleEdgeStatus = useStore((s) => s.toggleEdgeStatus);
  const t = useStore((s) => s.t);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-700 flex flex-col p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        {t['panel.properties']}
      </h2>

      {!selectedNode && !selectedEdge && (
        <div className="text-gray-500 text-sm text-center mt-8">
          {t['panel.selectPrompt']}
        </div>
      )}

      {selectedNode && (
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{
                backgroundColor: DEVICE_DEFAULTS[selectedNode.type].color + '22',
              }}
            >
              {DEVICE_DEFAULTS[selectedNode.type].icon}
            </div>
            <div>
              <div className="text-white font-medium">{selectedNode.label}</div>
              <div className="text-xs text-gray-400 capitalize">
                {selectedNode.type.replace('-', ' ')}
              </div>
            </div>
          </div>

          {/* Interfaces */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">{t['panel.interfaces']}</h3>
            {selectedNode.interfaces.map((iface) => (
              <div key={iface.id} className="bg-gray-800 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t['panel.mac']}</span>
                  <span className="text-gray-200 font-mono text-xs">{iface.mac}</span>
                </div>
                {iface.ip && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t['panel.ip']}</span>
                    <span className="text-gray-200 font-mono text-xs">{iface.ip}</span>
                  </div>
                )}
                {iface.subnetMask && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t['panel.mask']}</span>
                    <span className="text-gray-200 font-mono text-xs">{iface.subnetMask}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ARP Table */}
          {Object.keys(selectedNode.arpTable).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">{t['panel.arpTable']}</h3>
              <div className="bg-gray-800 rounded-lg p-3 text-xs font-mono space-y-1">
                {Object.entries(selectedNode.arpTable).map(([ip, mac]) => (
                  <div key={ip} className="flex justify-between">
                    <span className="text-gray-300">{ip}</span>
                    <span className="text-gray-400">{mac}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TCP State */}
          {selectedNode.tcpState && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">{t['panel.tcpState']}</h3>
              <div className="bg-gray-800 rounded-lg p-3 text-sm">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-mono font-bold ${
                    selectedNode.tcpState === 'ESTABLISHED'
                      ? 'bg-green-900/40 text-green-400'
                      : selectedNode.tcpState === 'CLOSED'
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-blue-900/40 text-blue-400'
                  }`}
                >
                  {selectedNode.tcpState}
                </span>
              </div>
            </div>
          )}

          {/* Delete */}
          <button
            onClick={() => removeNode(selectedNode.id)}
            className="mt-2 py-2 px-3 rounded-lg text-sm bg-red-900/30 text-red-400
                       hover:bg-red-900/50 border border-red-900/50 transition-colors"
          >
            {t['panel.deleteDevice']}
          </button>
        </div>
      )}

      {selectedEdge && (
        <div className="flex flex-col gap-4">
          <div className="text-white font-medium">{t['panel.connection']}</div>
          <div className="bg-gray-800 rounded-lg p-3 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">{t['panel.from']}</span>
              <span className="text-gray-200">
                {nodes.find((n) => n.id === selectedEdge.from.nodeId)?.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t['panel.to']}</span>
              <span className="text-gray-200">
                {nodes.find((n) => n.id === selectedEdge.to.nodeId)?.label}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">{t['panel.status']}</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  selectedEdge.status === 'up'
                    ? 'bg-green-900/40 text-green-400'
                    : 'bg-red-900/40 text-red-400'
                }`}
              >
                {selectedEdge.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => toggleEdgeStatus(selectedEdge.id)}
              className="flex-1 py-2 px-3 rounded-lg text-sm bg-gray-800 text-gray-300
                         hover:bg-gray-700 border border-gray-700 transition-colors"
            >
              {t['panel.toggleStatus']}
            </button>
            <button
              onClick={() => removeEdge(selectedEdge.id)}
              className="flex-1 py-2 px-3 rounded-lg text-sm bg-red-900/30 text-red-400
                         hover:bg-red-900/50 border border-red-900/50 transition-colors"
            >
              {t['panel.delete']}
            </button>
          </div>
        </div>
      )}

      {/* Packet Log - always visible at bottom */}
      <div className="mt-auto pt-4 border-t border-gray-700">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {t['panel.packetLog']}
        </h2>
        <PacketLog />
      </div>
    </div>
  );
}
