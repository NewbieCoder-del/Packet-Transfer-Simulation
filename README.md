# NetLab Studio

An interactive, browser-based network communication visualizer for Computer Networks courses.
Place devices on a canvas, connect them, and watch packets move through the topology step by step.

NetLab Studio is the continuation of the *BeforeDaybreak Network Simulator* project; the original
topology editor and protocol engine are retained and extended rather than rewritten.

## Overview

The tool is inspired by Cisco Packet Tracer, but focuses on **visual understanding** rather than
device configuration. ARP, ICMP, TCP, DNS and HTTP are modelled as state machines, and packet
movement is animated across a topology you build yourself.

- No server required — runs entirely in the browser
- Drag-and-drop or click-to-place device placement
- Resizable docks, dark and light themes, keyboard shortcuts
- Step-by-step packet animation with protocol-specific colors
- Live inspector showing interfaces, ARP / MAC / routing tables, TCP state and packet logs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| State | Zustand (4 store slices) |
| Rendering | SVG (no canvas libraries) |
| Styling | Tailwind CSS v4 (design tokens in `src/index.css`) |
| Storage | LocalStorage |

## Getting Started

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
npm run build    # type-check and produce the production bundle
npm run preview  # serve the production build locally
```

## How to Use

### 1. Place devices

Drag a device from the left **Device Library** onto the canvas, or click a device to arm placement
and then click the target position.

| Device | Role |
|--------|------|
| **Host (PC)** | sends and receives traffic |
| **Switch** | Layer-2 forwarding, four ports |
| **Router** | Layer-3 routing, two ports |
| **DNS Server** | resolves hostnames |
| **Web Server** | answers HTTP requests |

### 2. Connect devices

Press **C** (or click **Connect devices**), then click two devices. A rubber-band preview follows
the cursor while a connection is pending. Each link consumes one free port on both devices.

### 3. Run a scenario

Pick a scenario in the top toolbar — it starts immediately:

| Scenario | Flow |
|----------|------|
| **Ping** | ARP Request → ARP Reply → ICMP Echo → ICMP Reply |
| **HTTP Request** | ARP → TCP 3-Way Handshake → HTTP GET → HTTP Response |
| **DNS Lookup** | DNS Query → DNS Response |

### 4. Control the simulation

- **Play / Pause** — run or freeze the event queue
- **Step** — advance exactly one event
- **Reset** — clear events and animated packets
- **Speed** — 0.5x, 1x, 2x, 4x

### 5. Inspect state

Click a device or a link to open it in the right-hand panel: interfaces (name, MAC, IP, mask),
ARP table, switch MAC table, routing table, TCP state, and the connection list. The bottom dock
holds the packet log, filterable by protocol.

### 6. Save and load

**Save** stores the topology in LocalStorage; **Load** restores it, including interface and table
state. Legacy topologies saved by the previous version are normalized automatically on load.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select / move tool |
| `H` | Pan tool |
| `C` | Connect tool |
| `F` | Fit topology to view |
| `[` `]` | Narrow / widen the left dock |
| `+` `-` | Zoom in / out |
| `Delete` | Remove the selected device or link |
| `Esc` | Cancel placement, pending link or selection |
| `Space` (hold) | Temporary pan |

The canvas toolbelt also exposes snap-to-grid, zoom percentage, fit and reset-view controls.

## Project Structure

```
src/
├── types/network.ts           # Core types, device metadata, protocol colors
├── store/                     # Zustand store (4 slices)
│   ├── network-slice.ts       # Graph CRUD, port allocation, persistence
│   ├── simulation-slice.ts    # Event queue, animated packets
│   ├── ui-slice.ts            # Theme, dock sizes, selection, tools
│   └── log-slice.ts           # Packet log entries
├── engine/
│   ├── simulator.ts           # Event dispatcher (pure function)
│   ├── routing.ts             # Direct-edge lookup and BFS pathfinding
│   ├── scenarios.ts           # Preset scenario generators
│   └── protocols/             # Protocol state machines
│       ├── arp.ts  icmp.ts  tcp.ts  dns.ts  http.ts
├── components/
│   ├── canvas/                # SVG canvas, device nodes, edges, packet animation
│   ├── palette/               # Device library (drag source)
│   ├── panel/                 # Inspector, packet log, packet dock
│   ├── toolbar/               # Simulation controls
│   ├── layout/                # Title bar, status bar, resize handles
│   └── common/                # Shared UI primitives and device glyphs
├── hooks/use-simulation.ts    # rAF-based simulation orchestrator
└── utils/                     # MAC / IP / geometry helpers, LocalStorage
```

## Architecture

The engine runs on a **pure-function event loop**:

```
processEvent(event, nodes, edges) → { arpMutations, tcpMutations, newEvents, animations, logs }
```

Each protocol handler receives one event and returns state changes plus follow-up events. The
`useSimulation` hook drives the loop with `requestAnimationFrame`, coordinating event processing
with packet animation timing. Theme and dock layout persist under a separate `netlab-prefs`
LocalStorage key so they survive reloads without touching topology data.

## Known Limitations

- Packet animation is currently drawn only between **directly connected** devices. A topology that
  routes through a switch or a router produces correct protocol logs, but the intermediate hops are
  not yet animated. Multi-hop forwarding is the subject of the next increment.
- Interfaces are named and port-bound in the data model, but protocol handlers do not yet use
  per-port forwarding decisions.
- No automated test suite yet.
