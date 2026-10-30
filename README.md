# Network Simulator

An interactive, browser-based network communication visualization tool for CS students.
Place devices on a canvas, connect them, and watch packets flow through the network step by step.

> **[한국어 README는 아래에 있습니다.](#네트워크-시뮬레이터)**

---

## Overview

Network Simulator is an educational tool inspired by Cisco Packet Tracer, but focused on **visual understanding** rather than device configuration. It simulates network protocols (ARP, TCP, DNS, HTTP, ICMP) using state machines and visualizes packet movement across a topology you build.

- No server required — runs entirely in the browser
- Drag-and-drop device placement (draw.io style)
- Step-by-step packet animation with protocol-specific colors
- Real-time state panels showing ARP tables, TCP state, and packet logs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| State | Zustand |
| Rendering | SVG (no canvas libraries) |
| Styling | Tailwind CSS v4 |
| Storage | LocalStorage |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open `http://localhost:5173` in your browser.

## How to Use

### 1. Place Devices
Drag devices from the left palette onto the canvas:
- **Host (PC)** — sends/receives traffic
- **Switch** — L2 forwarding
- **Router** — L3 routing
- **DNS Server** — resolves hostnames
- **Web Server** — responds to HTTP requests

### 2. Connect Devices
Click **Connect Mode** in the left panel, then click two devices in sequence to create a link.

### 3. Run a Scenario
Select a scenario from the top toolbar:
| Scenario | Flow |
|----------|------|
| **Ping** | ARP Request → ARP Reply → ICMP Echo → ICMP Reply |
| **HTTP Request** | ARP → TCP 3-Way Handshake (SYN → SYN-ACK → ACK) → HTTP GET → HTTP Response |
| **DNS Lookup** | DNS Query → DNS Response |

### 4. Control Simulation
- **Play** — auto-advance through all events
- **Step** — advance one event at a time
- **Pause / Reset** — pause or restart
- **Speed** — 0.5x, 1x, 2x, 4x

### 5. Inspect State
Click any device to view in the right panel:
- IP / MAC addresses
- ARP table (updated in real-time)
- TCP connection state
- Packet log (color-coded by protocol)

### 6. Save / Load
Save your topology to LocalStorage and reload it later.

## Project Structure

```
src/
├── types/network.ts           # Core type definitions
├── store/                     # Zustand store (4 slices)
│   ├── network-slice.ts       # Graph CRUD (nodes, edges)
│   ├── simulation-slice.ts    # Event queue, active packets
│   ├── ui-slice.ts            # Selection, connection mode
│   └── log-slice.ts           # Packet log entries
├── engine/
│   ├── simulator.ts           # Event dispatcher (pure function)
│   ├── routing.ts             # BFS pathfinding
│   ├── scenarios.ts           # Preset scenario generators
│   └── protocols/             # Protocol state machines
│       ├── arp.ts
│       ├── icmp.ts
│       ├── tcp.ts
│       ├── dns.ts
│       └── http.ts
├── components/
│   ├── canvas/                # SVG canvas, nodes, edges, animations
│   ├── palette/               # Device palette (drag source)
│   ├── panel/                 # Status panel, packet log
│   └── toolbar/               # Simulation controls
├── hooks/use-simulation.ts    # rAF-based simulation orchestrator
└── utils/                     # MAC/IP generation, geometry, storage
```

## Architecture

The simulation engine is built on a **pure-function event loop**:

```
processEvent(state, event) → { stateMutations, newEvents, packetAnimations }
```

Each protocol handler receives an event, returns state changes and follow-up events. The `useSimulation` hook drives the loop with `requestAnimationFrame`, coordinating event processing and packet animations.

---

# 네트워크 시뮬레이터

CS 학생을 위한 인터랙티브 브라우저 기반 네트워크 통신 시각화 도구입니다.
캔버스에 장비를 배치하고 연결한 뒤, 패킷이 네트워크를 통해 이동하는 과정을 단계별로 관찰할 수 있습니다.

## 개요

Cisco Packet Tracer에서 영감을 받았지만, 장비 설정보다 **시각적 이해**에 초점을 맞춘 교육용 도구입니다. ARP, TCP, DNS, HTTP, ICMP 프로토콜을 상태 머신으로 시뮬레이션하고, 직접 구성한 토폴로지 위에서 패킷 이동을 시각화합니다.

- 서버 불필요 — 브라우저 단독 실행
- 드래그&드롭 장비 배치 (draw.io 스타일)
- 프로토콜별 색상으로 구분된 단계별 패킷 애니메이션
- ARP 테이블, TCP 상태, 패킷 로그를 실시간으로 표시하는 상태 패널

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | React 19 + TypeScript |
| 빌드 | Vite |
| 상태 관리 | Zustand |
| 렌더링 | SVG (캔버스 라이브러리 없음) |
| 스타일링 | Tailwind CSS v4 |
| 저장소 | LocalStorage |

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 프로덕션 빌드
npm run build
```

브라우저에서 `http://localhost:5173`을 열어주세요.

## 사용 방법

### 1. 장비 배치
좌측 팔레트에서 장비를 캔버스로 드래그합니다:
- **Host (PC)** — 트래픽 송수신
- **Switch** — L2 포워딩
- **Router** — L3 라우팅
- **DNS Server** — 호스트네임 해석
- **Web Server** — HTTP 요청 응답

### 2. 장비 연결
좌측 패널의 **Connect Mode** 버튼을 클릭한 뒤, 두 장비를 순서대로 클릭하면 연결됩니다.

### 3. 시나리오 실행
상단 툴바에서 시나리오를 선택합니다:
| 시나리오 | 흐름 |
|---------|------|
| **Ping** | ARP Request → ARP Reply → ICMP Echo → ICMP Reply |
| **HTTP Request** | ARP → TCP 3-Way Handshake (SYN → SYN-ACK → ACK) → HTTP GET → HTTP Response |
| **DNS Lookup** | DNS Query → DNS Response |

### 4. 시뮬레이션 제어
- **Play** — 모든 이벤트를 자동 진행
- **Step** — 한 이벤트씩 진행
- **Pause / Reset** — 일시정지 또는 초기화
- **Speed** — 0.5x, 1x, 2x, 4x 속도 조절

### 5. 상태 확인
장비를 클릭하면 우측 패널에서 확인 가능:
- IP / MAC 주소
- ARP 테이블 (실시간 업데이트)
- TCP 연결 상태
- 패킷 로그 (프로토콜별 색상 구분)

### 6. 저장 / 불러오기
토폴로지를 LocalStorage에 저장하고 나중에 불러올 수 있습니다.

## 아키텍처

시뮬레이션 엔진은 **순수 함수 기반 이벤트 루프**로 구현되어 있습니다:

```
processEvent(state, event) → { stateMutations, newEvents, packetAnimations }
```

각 프로토콜 핸들러는 이벤트를 받아 상태 변경과 후속 이벤트를 반환합니다. `useSimulation` 훅이 `requestAnimationFrame`으로 루프를 구동하며, 이벤트 처리와 패킷 애니메이션을 조율합니다.
