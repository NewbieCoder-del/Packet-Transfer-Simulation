# NetLab Studio

An interactive, browser-based network communication visualizer for Computer Networks courses.
Place devices on a canvas, connect them, and watch packets move through the topology step by step.

NetLab Studio is the continuation of the *BeforeDaybreak Network Simulator* project; the original
topology editor and protocol engine are retained and extended rather than rewritten.

## Overview

The tool is inspired by Cisco Packet Tracer, but focuses on **visual understanding** of what
happens on the wire. ARP, ICMP, TCP, UDP, DNS and HTTP are modelled as state machines, and every
frame is forwarded hop by hop through the switches and routers of a topology you build yourself.

- No server required — runs entirely in the browser
- Drag-and-drop or click-to-place device placement
- Interface addresses, default gateways and static routes are configured in the inspector
- Resizable docks, dark and light themes, keyboard shortcuts
- Step-by-step packet animation with protocol-specific colors
- Live inspector showing interfaces, ARP / MAC / routing tables, TCP state and packet logs
- Six step-through Networking Labs for OSI encapsulation, CRC, Hamming codes, ARQ, MAC and TCP congestion

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| State | Zustand (4 store slices) |
| Rendering | SVG (no canvas libraries) |
| Styling | Tailwind CSS v4 (design tokens in `src/index.css`) |
| Storage | LocalStorage |
| Tests | Vitest |

## Getting Started

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
npm test         # run the algorithm and engine test suite
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
| **DNS Lookup** | DNS Query → DNS Response over UDP port 53 |
| **UDP Datagram** | Connectionless datagram to UDP port 7 and its echo |

Source and target come from the **Traffic** dropdowns; leave them on *Auto* to let NetLab Studio pick
a sensible pair from the current topology.

### 4. Control the simulation

- **Play / Pause** — run or freeze the event queue
- **Step** — advance exactly one event
- **Reset** — clear events and animated packets
- **Speed** — 0.5x, 1x, 2x, 4x

### 5. Configure and inspect state

Click a device or a link to open it in the right-hand panel. Interfaces show name, MAC and the
peer on the other end of the port; the IPv4 and mask fields are editable and commit on blur or
Enter, with validation for malformed addresses and duplicates. End devices also expose a default
gateway, routers a static-route table. Below them sit the live ARP table, the switch MAC table and
the TCP state.

The bottom dock holds the packet log, filterable by protocol. Clicking a log row that carried a
PDU opens the **packet inspector** — Ethernet II, ARP, IPv4, TCP/UDP and ICMP headers exactly as
that device saw them.

### 6. Save and load

**Save** stores the topology in LocalStorage; **Load** restores it, including interface and table
state. Legacy topologies saved by the previous version are normalized automatically on load.

### 7. Networking Labs

The **Labs** tab in the title bar opens six standalone teaching laboratories. Each lab has its own
configuration form, a **Start / Pause** auto-play, **Step** to advance exactly one step, and
**Reset**, with every calculation and state transition written out as it happens.

| Lab | What it demonstrates |
|-----|----------------------|
| **OSI Model** | Encapsulation down the seven layers and decapsulation back up, with the PDU name, header size and total frame size at each layer |
| **CRC** | Polynomial long division of the data by the generator, the transmitted frame, a single-bit corruption and the receiver's remainder check |
| **Hamming Code** | Parity-bit placement, the encoded codeword, syndrome calculation, single-bit error detection and correction |
| **ARQ Protocols** | Stop-and-Wait, Go-Back-N and Selective Repeat over a seeded channel with configurable frame loss, showing every ACK, timeout and retransmission |
| **Medium Access Control** | Pure ALOHA, Slotted ALOHA and CSMA/CD on a shared channel, with per-station success, collision bands and throughput versus the theoretical maximum |
| **TCP Congestion Control** | Slow start, congestion avoidance, 3-duplicate-ACK fast recovery and timeout collapse, charted RTT by RTT |

ARQ and MAC use a seeded pseudo-random channel, so the same seed always reproduces the same run.
Configuration changes regenerate the result and return playback to the first step. The labs share
the simulator's theme and are entirely independent of the topology workspace.

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
│   ├── forwarding.ts          # Per-hop delivery, ARP chaining, switching and routing
│   ├── routing.ts             # Direct-edge lookup and BFS pathfinding
│   ├── scenarios.ts           # Preset scenario generators
│   └── protocols/             # Protocol state machines
│       ├── arp.ts  icmp.ts  tcp.ts  udp.ts  dns.ts  http.ts
├── labs/                      # Pure lab engines, registry and playback hook
│   ├── osi.ts  crc.ts  hamming.ts  arq.ts  mac.ts  tcp-congestion.ts
│   ├── registry.ts            # Lab catalogue used by the sidebar
│   ├── use-lab-player.ts      # Step / play / reset state machine
│   └── *.test.ts              # One Vitest file per algorithm
├── components/
│   ├── canvas/                # SVG canvas, device nodes, edges, packet animation
│   ├── palette/               # Device library (drag source)
│   ├── panel/                 # Inspector, packet log, packet inspector
│   ├── labs/                  # Labs sidebar, shared frame and one component per lab
│   ├── toolbar/               # Simulation controls
│   ├── layout/                # Title bar, status bar, resize handles
│   └── common/                # Shared UI primitives and device glyphs
├── hooks/use-simulation.ts    # rAF-based simulation orchestrator
└── utils/                     # MAC / IP / geometry helpers, LocalStorage
```

## Architecture

The engine runs on a **pure-function event loop**:

```
processEvent(event, nodes, edges) → { arpMutations, macMutations, tcpMutations, newEvents, animations, logs }
```

Each event names the device that currently **holds** the frame, so a switch or a router forwards one
hop at a time instead of teleporting a packet to its final owner. Handlers return state changes plus
follow-up events; `useSimulation` drives the loop with `requestAnimationFrame`, processing the next
event only once the frames of the current hop have finished their animation. Theme and dock layout
persist under a separate `netlab-prefs` LocalStorage key so they survive reloads without touching
topology data.

## Known Limitations

- Forwarding is hop-by-hop and honest about failures — a frame with no route, no gateway, a dead
  port or an exceeded TTL is dropped with a log line — but the model is still simplified:
  ARP entries never age out, and there is no congestion, latency, bit-error or retransmission
  modelling. Links are either up or down.
- Switching has no spanning tree. A topology with a physical loop floods broadcasts until the
  per-frame path guard discards them rather than converging to a loop-free topology.
- Routing is connected-subnet plus static-route only: no dynamic protocols, NAT, DHCP, VLANs or
  ACLs.
- The DNS server answers a query with the first web server configured in the topology. There is no
  zone data, recursion or negative caching.
- TCP models the three-way handshake and carries one application PDU over it. There is no teardown
  (`FIN`/`RST`), windowing or sequencing beyond the flags shown in the inspector.
- Header fields shown in the packet inspector are the ones the engine actually uses; checksums,
  options and fragmentation are not modelled.
- LocalStorage holds a single topology slot plus UI preferences; there are no named profiles.
- The labs are teaching models, not full protocol stacks: CRC and Hamming operate on bit strings with
  a single injected error, ARQ runs a discrete-time stop-and-wait / sliding-window channel with
  seeded loss, MAC uses fixed-length slots, and TCP congestion control advances once per RTT with no
  delayed ACKs, SACK or receiver window. Session state (results, playback position) is not persisted.
- The test suite covers the lab algorithms and the forwarding engine; canvas interactions and lab
  React components are exercised manually rather than in a DOM test environment.
