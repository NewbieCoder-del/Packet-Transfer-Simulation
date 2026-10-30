import DevicePalette from './components/palette/DevicePalette';
import NetworkCanvas from './components/canvas/NetworkCanvas';
import StatusPanel from './components/panel/StatusPanel';
import SimulationToolbar from './components/toolbar/SimulationToolbar';

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      <SimulationToolbar />
      <div className="flex flex-1 min-h-0">
        <DevicePalette />
        <NetworkCanvas />
        <StatusPanel />
      </div>
    </div>
  );
}
