import TitleBar from './components/layout/TitleBar';
import StatusBar from './components/layout/StatusBar';
import ResizeHandle from './components/layout/ResizeHandle';
import DevicePalette from './components/palette/DevicePalette';
import NetworkCanvas from './components/canvas/NetworkCanvas';
import StatusPanel from './components/panel/StatusPanel';
import PacketDock from './components/panel/PacketDock';
import SimulationToolbar from './components/toolbar/SimulationToolbar';
import LabsView from './components/labs/LabsView';
import { useStore } from './store';

export default function App() {
  const section = useStore((s) => s.section);
  const leftWidth = useStore((s) => s.leftWidth);
  const rightWidth = useStore((s) => s.rightWidth);
  const setLeftWidth = useStore((s) => s.setLeftWidth);
  const setRightWidth = useStore((s) => s.setRightWidth);

  return (
    <div className="flex h-full flex-col bg-surface-0 text-ink-1">
      <TitleBar />

      {section === 'labs' ? (
        <LabsView />
      ) : (
        <>
          <SimulationToolbar />

          <div className="flex min-h-0 flex-1">
            <aside style={{ width: leftWidth }} className="flex shrink-0 flex-col">
              <DevicePalette />
            </aside>
            <ResizeHandle
              axis="x"
              label="Resize device library"
              onDelta={(dx) => setLeftWidth(leftWidth + dx)}
              onKeyStep={(step) => setLeftWidth(leftWidth + step)}
            />

            <main className="flex min-w-0 flex-1 flex-col">
              <NetworkCanvas />
              <PacketDock />
            </main>

            <ResizeHandle
              axis="x"
              label="Resize inspector"
              onDelta={(dx) => setRightWidth(rightWidth - dx)}
              onKeyStep={(step) => setRightWidth(rightWidth - step)}
            />
            <aside style={{ width: rightWidth }} className="flex shrink-0 flex-col">
              <StatusPanel />
            </aside>
          </div>
        </>
      )}

      <StatusBar />
    </div>
  );
}
