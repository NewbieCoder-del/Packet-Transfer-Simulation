import { useRef, useCallback } from 'react';
import { useStore } from '../store';
import { processEvent } from '../engine/simulator';
import { findDirectEdge } from '../engine/routing';
import { generateId } from '../utils/mac';
import type { AnimatedPacket } from '../types/network';

const ANIMATION_DURATION = 1200; // ms per packet hop

export function useSimulation() {
  const rafRef = useRef<number>(0);
  const stepScheduled = useRef(false);

  const step = useCallback(() => {
    const store = useStore.getState();
    const { eventQueue, nodes, edges } = store;

    if (eventQueue.length === 0 && store.activePackets.length === 0) {
      store.setSimState('idle');
      return;
    }

    // Only process next event if no animations are in flight
    if (store.activePackets.length === 0 && eventQueue.length > 0) {
      const event = store.dequeueEvent();
      if (!event) return;

      const result = processEvent(event, nodes, edges);

      // Device tables and states are updated by the engine, not by the device itself.
      useStore.setState((s) => ({
        nodes: s.nodes.map((node) => {
          const arp = result.arpMutations.filter((m) => m.nodeId === node.id);
          const mac = result.macMutations.filter((m) => m.nodeId === node.id);
          const tcp = result.tcpMutations.find((m) => m.nodeId === node.id);
          if (arp.length === 0 && mac.length === 0 && !tcp) return node;
          return {
            ...node,
            ...(arp.length > 0
              ? { arpTable: { ...node.arpTable, ...Object.fromEntries(arp.map((m) => [m.ip, m.mac])) } }
              : {}),
            ...(mac.length > 0 && node.macTable !== undefined
              ? { macTable: { ...node.macTable, ...Object.fromEntries(mac.map((m) => [m.entry.mac, m.entry])) } }
              : {}),
            ...(tcp ? { tcpState: tcp.tcpState } : {}),
          };
        }),
      }));

      // Enqueue new events
      for (const newEvent of result.newEvents) {
        store.enqueueEvent(newEvent);
      }

      // Add logs
      for (const log of result.logs) {
        store.addLog(event.time, log.text, log.packet, log.nodeId);
      }

      // Create animations
      const now = performance.now();
      for (const anim of result.animations) {
        const edgeId = findDirectEdge(anim.fromNodeId, anim.toNodeId, edges);
        if (!edgeId) continue;

        const animatedPacket: AnimatedPacket = {
          id: generateId(),
          packet: anim.packet,
          fromNodeId: anim.fromNodeId,
          toNodeId: anim.toNodeId,
          edgeId,
          progress: 0,
          startTime: now,
          duration: ANIMATION_DURATION / store.speed,
        };
        store.addActivePacket(animatedPacket);
      }
    }
  }, []);

  /** One outstanding step at a time, and never while the run is paused or finished. */
  const scheduleStep = useCallback(
    (delay: number) => {
      if (stepScheduled.current) return;
      stepScheduled.current = true;
      setTimeout(() => {
        stepScheduled.current = false;
        const state = useStore.getState().simState;
        if (state === 'running' || state === 'stepping') step();
      }, delay);
    },
    [step]
  );

  const animate = useCallback(function frame(timestamp: number) {
    const store = useStore.getState();
    if (store.simState !== 'running' && store.simState !== 'stepping') return;

    const activePackets = store.activePackets;
    let allDone = true;

    for (const pkt of activePackets) {
      const elapsed = timestamp - pkt.startTime;
      const progress = Math.min(elapsed / pkt.duration, 1);
      store.updatePacketProgress(pkt.id, progress);

      if (progress >= 1) {
        store.removeActivePacket(pkt.id);
      } else {
        allDone = false;
      }
    }

    if (allDone && activePackets.length > 0) {
      // Every animation for this hop is done, so the next event can go out.
      if (store.simState === 'stepping') {
        store.setSimState('paused');
      } else {
        // Small delay before next event
        scheduleStep(200);
      }
    } else if (activePackets.length === 0) {
      if (store.eventQueue.length > 0) {
        // The last event left no frame on the wire — it only started an ARP resolution —
        // so waiting for an animation to finish would stall the run.
        scheduleStep(60);
      } else if (store.simState === 'running') {
        store.setSimState('idle');
      }
    }

    if (store.simState === 'running' || store.activePackets.length > 0) {
      rafRef.current = requestAnimationFrame(frame);
    }
  }, [scheduleStep]);

  const start = useCallback(() => {
    const store = useStore.getState();
    if (store.eventQueue.length === 0 && store.activePackets.length === 0) return;
    store.setSimState('running');
    step();
    rafRef.current = requestAnimationFrame(animate);
  }, [step, animate]);

  const pause = useCallback(() => {
    useStore.getState().setSimState('paused');
    cancelAnimationFrame(rafRef.current);
  }, []);

  const resume = useCallback(() => {
    const store = useStore.getState();
    store.setSimState('running');
    step();
    rafRef.current = requestAnimationFrame(animate);
  }, [step, animate]);

  const stepOnce = useCallback(() => {
    const store = useStore.getState();
    store.setSimState('stepping');
    step();
    rafRef.current = requestAnimationFrame(animate);
  }, [step, animate]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const store = useStore.getState();
    store.resetSimulation();
    store.clearLogs();
    // Learned tables and connection state belong to a run, not to the configuration.
    useStore.setState((s) => ({
      nodes: s.nodes.map((n) => ({
        ...n,
        tcpState: undefined,
        arpTable: {},
        ...(n.macTable ? { macTable: {} } : {}),
      })),
    }));
  }, []);

  return { start, pause, resume, stepOnce, reset };
}
